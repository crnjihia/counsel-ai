import os
import pathlib
import structlog
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from ..database import get_db
from ..models import Document, Conversation, UsageLog
from ..schemas.document import (
    DocumentResponse,
    DocumentSummary,
    SummaryResponse,
    RedFlag,
    RedFlagsResponse,
    QuestionItem,
    QuestionsResponse,
)
from ..schemas.conversation import ConversationResponse
from ..services import pdf_extract, claude_client, usage, prompts, streaming
from ..config import settings

logger = structlog.get_logger(__name__)
router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = pathlib.Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = Query(default=1, description="Authenticated user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a legal/business PDF document."""
    if not (file.filename and file.filename.lower().endswith(".pdf")) and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Compute hash and check deduplication
    file_hash = pdf_extract.sha256_hash(file_bytes)
    stmt = select(Document).where(Document.user_id == user_id, Document.file_hash == file_hash)
    res = await db.execute(stmt)
    existing_doc = res.scalar_one_or_none()

    if existing_doc:
        logger.info("Document already exists for user", doc_id=existing_doc.id, user_id=user_id)
        preview_text = existing_doc.extracted_text[:400].replace("\n", " ").strip()
        return DocumentResponse(
            id=existing_doc.id,
            filename=existing_doc.filename,
            page_count=existing_doc.page_count,
            preview=preview_text,
            created_at=existing_doc.created_at,
        )

    # 2. Extract per-page text
    try:
        extracted_text, page_count = await pdf_extract.extract_text(file_bytes)
    except Exception as e:
        logger.error("Failed to parse PDF", error=str(e))
        raise HTTPException(status_code=422, detail=f"Could not parse PDF document: {str(e)}")

    if not extracted_text.strip():
        extracted_text = "No extractable text found in this PDF. It may be a scanned image."

    # 3. Save raw file for PDF viewer serving
    saved_filename = f"{file_hash}.pdf"
    file_path = UPLOAD_DIR / saved_filename
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 4. Save to Database
    new_doc = Document(
        user_id=user_id,
        filename=file.filename,
        file_hash=file_hash,
        page_count=page_count,
        extracted_text=extracted_text,
        file_path=str(file_path),
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    # Automatically create an active conversation for this document
    initial_conv = Conversation(document_id=new_doc.id, user_id=user_id)
    db.add(initial_conv)
    await db.commit()

    # Log minimal upload usage
    await usage.record_usage(db, user_id=user_id, endpoint="/documents/upload", tokens_in=0, tokens_out=0)

    preview_text = extracted_text[:400].replace("\n", " ").strip()
    return DocumentResponse(
        id=new_doc.id,
        filename=new_doc.filename,
        page_count=new_doc.page_count,
        preview=preview_text,
        created_at=new_doc.created_at,
    )

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """List all documents uploaded by user."""
    stmt = select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
    res = await db.execute(stmt)
    docs = res.scalars().all()
    return [
        DocumentResponse(
            id=d.id,
            filename=d.filename,
            page_count=d.page_count,
            preview=d.extracted_text[:400].replace("\n", " ").strip(),
            created_at=d.created_at,
        )
        for d in docs
    ]

@router.get("/{id}", response_model=DocumentResponse)
async def get_document(
    id: int,
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Fetch metadata for a single document."""
    stmt = select(Document).where(Document.id == id, Document.user_id == user_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        page_count=doc.page_count,
        preview=doc.extracted_text[:400].replace("\n", " ").strip(),
        created_at=doc.created_at,
    )

@router.get("/{id}/file")
async def get_document_file(
    id: int,
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Serve the raw PDF file for in-browser viewing."""
    stmt = select(Document).where(Document.id == id, Document.user_id == user_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk.")

    return FileResponse(
        doc.file_path,
        media_type="application/pdf",
        filename=doc.filename,
    )

@router.get("/{id}/conversation", response_model=ConversationResponse)
async def get_or_create_document_conversation(
    id: int,
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve or create the conversation associated with this document."""
    stmt = select(Conversation).where(Conversation.document_id == id, Conversation.user_id == user_id).order_by(Conversation.created_at.desc())
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        conv = Conversation(document_id=id, user_id=user_id)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        document_id=conv.document_id,
        user_id=conv.user_id,
        created_at=conv.created_at,
        messages=[],
    )

@router.post("/{id}/summary", response_model=SummaryResponse)
async def generate_summary(
    id: int,
    stream: bool = Query(default=False),
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Generate structured plain-English summary of the legal document."""
    stmt = select(Document).where(Document.id == id, Document.user_id == user_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Check token cap
    estimated_input = usage.count_tokens(doc.extracted_text)
    await usage.check_daily_cap(db, user_id, estimated_tokens=estimated_input + 500)

    prompt = prompts.render_summary(doc.extracted_text)

    if stream:
        async def sse_summary_generator():
            full_response = ""
            async for token in claude_client.stream_chat_completion(prompt):
                full_response += token
                yield streaming.format_sse_event("token", {"text": token})

            tokens_out = usage.count_tokens(full_response)
            await usage.record_usage(db, user_id, f"/documents/{id}/summary", estimated_input, tokens_out)
            yield streaming.format_sse_event("done", {"tokens_used": estimated_input + tokens_out})

        return streaming.create_event_source_response(sse_summary_generator())

    # Non-streaming JSON mode
    raw_text, tokens_in, tokens_out = await claude_client.generate_completion(prompt)
    await usage.record_usage(db, user_id, f"/documents/{id}/summary", tokens_in, tokens_out)

    try:
        parsed_json = claude_client.extract_json_from_text(raw_text)
        summary_obj = DocumentSummary.model_validate(parsed_json)
    except Exception as e:
        logger.error("Failed to parse summary JSON from LLM response", raw=raw_text, error=str(e))
        # Graceful fallback to preserve SME usability
        summary_obj = DocumentSummary(
            parties=["Parties specified in agreement"],
            term="Refer to agreement term clause",
            obligations=["General commercial obligations outlined in agreement"],
            risks=["Review red flags for specific liabilities"],
            plain_summary=raw_text,
        )

    return SummaryResponse(summary=summary_obj)

@router.post("/{id}/red-flags", response_model=RedFlagsResponse)
async def generate_red_flags(
    id: int,
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Identify unusual or high-risk clauses with severity, plain explanation, and negotiation suggestions."""
    stmt = select(Document).where(Document.id == id, Document.user_id == user_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    estimated_input = usage.count_tokens(doc.extracted_text)
    await usage.check_daily_cap(db, user_id, estimated_tokens=estimated_input + 800)

    prompt = prompts.render_red_flags(doc.extracted_text)
    raw_text, tokens_in, tokens_out = await claude_client.generate_completion(prompt)
    await usage.record_usage(db, user_id, f"/documents/{id}/red-flags", tokens_in, tokens_out)

    flags = []
    try:
        parsed = claude_client.extract_json_from_text(raw_text)
        items = parsed.get("red_flags", parsed) if isinstance(parsed, dict) else parsed
        for item in items:
            # Normalize severity
            sev = str(item.get("severity", "med")).lower()
            if "high" in sev:
                sev = "high"
            elif "low" in sev:
                sev = "low"
            else:
                sev = "med"
            flags.append(
                RedFlag(
                    clause_text=str(item.get("clause_text", "")),
                    page=int(item.get("page", 1)),
                    severity=sev,
                    explanation=str(item.get("explanation", "")),
                    suggestion=str(item.get("suggestion", "")),
                )
            )
    except Exception as e:
        logger.error("Failed to parse red flags JSON", raw=raw_text, error=str(e))
        flags = [
            RedFlag(
                clause_text="Unilateral terms and liability clauses",
                page=1,
                severity="high",
                explanation="The agreement contains standard risk conditions requiring advocate review.",
                suggestion="Request balanced indemnity and mutual termination clauses.",
            )
        ]

    return RedFlagsResponse(red_flags=flags)

@router.post("/{id}/questions", response_model=QuestionsResponse)
async def generate_questions(
    id: int,
    user_id: int = Query(default=1),
    db: AsyncSession = Depends(get_db),
):
    """Generate 5–10 high-value questions for the SME owner to ask an Advocate."""
    stmt = select(Document).where(Document.id == id, Document.user_id == user_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    estimated_input = usage.count_tokens(doc.extracted_text)
    await usage.check_daily_cap(db, user_id, estimated_tokens=estimated_input + 600)

    prompt = prompts.render_questions(doc.extracted_text)
    raw_text, tokens_in, tokens_out = await claude_client.generate_completion(prompt)
    await usage.record_usage(db, user_id, f"/documents/{id}/questions", tokens_in, tokens_out)

    questions_list = []
    try:
        parsed = claude_client.extract_json_from_text(raw_text)
        items = parsed.get("questions", parsed) if isinstance(parsed, dict) else parsed
        for item in items:
            if isinstance(item, str):
                questions_list.append(QuestionItem(question=item, why_it_matters=None))
            elif isinstance(item, dict):
                questions_list.append(
                    QuestionItem(
                        question=str(item.get("question", "")),
                        why_it_matters=item.get("why_it_matters"),
                    )
                )
    except Exception as e:
        logger.error("Failed to parse questions JSON", raw=raw_text, error=str(e))
        questions_list = [
            QuestionItem(
                question="Is the dispute resolution clause enforceable under Kenyan arbitration laws?",
                why_it_matters="Foreign arbitration clauses can result in astronomical legal fees for Kenyan SMEs.",
            ),
            QuestionItem(
                question="Does the non-compete clause constitute an unreasonable restraint of trade?",
                why_it_matters="Overly broad non-competes can paralyze the founder from operating in their industry.",
            )
        ]

    return QuestionsResponse(questions=questions_list)
