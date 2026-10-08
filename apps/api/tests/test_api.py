import pytest
import io
from apps.api.models import Document, Conversation, UsageLog
from apps.api.config import settings

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Kenya" in data["jurisdiction"]

@pytest.mark.asyncio
async def test_upload_document(client, monkeypatch):
    # Mock pdfplumber extraction to avoid dependency on complex binary PDF parsing in unit test
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nSample Kenyan NDA Agreement\nParty A: Nairobi Tech Ltd\nParty B: Rift Supplies Ltd", 1

    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    files = {"file": ("test_agreement.pdf", pdf_content, "application/pdf")}

    response = await client.post("/documents/upload?user_id=1", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test_agreement.pdf"
    assert data["page_count"] == 1
    assert "Nairobi Tech" in data["preview"]
    doc_id = data["id"]

    # Deduplication test: re-uploading same file hash returns the existing doc
    dup_response = await client.post("/documents/upload?user_id=1", files=files)
    assert dup_response.status_code == 200
    dup_data = dup_response.json()
    assert dup_data["id"] == doc_id

@pytest.mark.asyncio
async def test_document_summary(client, monkeypatch):
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nSample Agreement Text for Summary", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    # 1. Upload
    files = {"file": ("nda.pdf", b"%PDF-1.4 mock", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=1", files=files)
    doc_id = upload_res.json()["id"]

    # 2. Get non-streaming summary
    sum_res = await client.post(f"/documents/{doc_id}/summary?user_id=1")
    assert sum_res.status_code == 200
    data = sum_res.json()
    assert "summary" in data
    assert "Acme Ltd" in data["summary"]["parties"]
    assert "2 years renewable" in data["summary"]["term"]

@pytest.mark.asyncio
async def test_document_summary_streaming(client, monkeypatch):
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nSample Agreement Text", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    files = {"file": ("nda_stream.pdf", b"%PDF-1.4 mock stream", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=1", files=files)
    doc_id = upload_res.json()["id"]

    # Test SSE stream mode
    res = await client.post(f"/documents/{doc_id}/summary?stream=true&user_id=1")
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    assert "event: token" in res.text
    assert "event: done" in res.text

@pytest.mark.asyncio
async def test_document_red_flags(client, monkeypatch):
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nNon-compete clause in East Africa", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    files = {"file": ("tenancy.pdf", b"%PDF-1.4 tenancy", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=1", files=files)
    doc_id = upload_res.json()["id"]

    res = await client.post(f"/documents/{doc_id}/red-flags?user_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "red_flags" in data
    assert len(data["red_flags"]) >= 1
    flag = data["red_flags"][0]
    assert flag["severity"] in ["high", "med", "low"]
    assert flag["page"] == 1
    assert "suggestion" in flag

@pytest.mark.asyncio
async def test_document_questions(client, monkeypatch):
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nIndemnity and liability clause", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    files = {"file": ("permit.pdf", b"%PDF-1.4 permit", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=1", files=files)
    doc_id = upload_res.json()["id"]

    res = await client.post(f"/documents/{doc_id}/questions?user_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert len(data["questions"]) >= 1
    assert "indemnity" in data["questions"][0]["question"].lower()

@pytest.mark.asyncio
async def test_chat_streaming_and_history(client, monkeypatch):
    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nKenyan SME lease agreement clause 4", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    files = {"file": ("lease.pdf", b"%PDF-1.4 lease", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=1", files=files)
    doc_id = upload_res.json()["id"]

    # 1. Fetch conversation id
    conv_res = await client.get(f"/documents/{doc_id}/conversation?user_id=1")
    assert conv_res.status_code == 200
    conv_id = conv_res.json()["id"]

    # 2. Post chat message with SSE stream
    chat_payload = {"content": "Can the landlord increase rent arbitrarily?"}
    chat_res = await client.post(
        f"/conversations/{conv_id}/messages?user_id=1",
        json=chat_payload
    )
    assert chat_res.status_code == 200
    assert "text/event-stream" in chat_res.headers["content-type"]
    assert "event: token" in chat_res.text
    assert "event: done" in chat_res.text
    assert "Mshauri" in chat_res.text

    # 3. Check history persistence
    hist_res = await client.get(f"/conversations/{conv_id}/messages?user_id=1")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2  # 1 user + 1 assistant
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "Can the landlord increase rent arbitrarily?"
    assert history[1]["role"] == "assistant"

@pytest.mark.asyncio
async def test_usage_tracking(client):
    res = await client.get("/usage?user_id=1")
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == 1
    assert "total_tokens_month" in data
    assert "total_cost_usd_month" in data
    assert data["daily_token_cap"] == 100_000

@pytest.mark.asyncio
async def test_daily_token_cap_enforcement(client, monkeypatch):
    # Set cap very low
    monkeypatch.setattr(settings, "DAILY_TOKEN_CAP", 50)

    async def mock_extract(file_bytes):
        return "\n---PAGE 1---\nVery long agreement that exceeds limits", 1
    monkeypatch.setattr("apps.api.services.pdf_extract.extract_text", mock_extract)

    files = {"file": ("large.pdf", b"%PDF-1.4 large", "application/pdf")}
    upload_res = await client.post("/documents/upload?user_id=99", files=files)
    doc_id = upload_res.json()["id"]

    # Request summary should trigger 429
    res = await client.post(f"/documents/{doc_id}/summary?user_id=99")
    assert res.status_code == 429
    assert "quota exceeded" in res.json()["detail"].lower()
