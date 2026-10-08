# Counsel AI Monorepo

## Repository Tree
```
counsel-ai/
├── apps/
│   ├── api/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── document.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   └── usage_log.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── document.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   └── usage_log.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── documents.py
│   │   │   ├── conversations.py
│   │   │   └── usage.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_extract.py
│   │   │   ├── claude_client.py
│   │   │   ├── context.py
│   │   │   ├── usage.py
│   │   │   └── streaming.py
│   │   ├── prompts/
│   │   │   ├── system.md
│   │   │   ├── summary.jinja2
│   │   │   ├── red_flags.jinja2
│   │   │   ├── questions.jinja2
│   │   │   └── chat.jinja2
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── conftest.py
│   │       └── test_api.py
│   └── web/
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── routes/
│           │   └── index.tsx
│           ├── pages/
│           │   ├── HomePage.tsx
│           │   ├── DocumentPage.tsx
│           │   └── UsagePage.tsx
│           ├── components/
│           │   ├── UploadZone.tsx
│           │   ├── PdfViewer.tsx
│           │   ├── RedFlagList.tsx
│           │   ├── StreamingMessage.tsx
│           │   ├── ChatPanel.tsx
│           │   └── UsageMeter.tsx
│           ├── hooks/
│           │   └── useApi.ts
│           └── api/
│               └── client.ts
├── docker-compose.yml
├── .env.example
├── README.md
└── samples/
    └── generate_sample.py
```

---

## Backend (`apps/api/`)

### `apps/api/main.py`
```python
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import documents, conversations, usage
from .config import settings

app = FastAPI(title="Counsel AI API", version="0.1.0")

# CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(usage.router, prefix="/usage", tags=["usage"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(
        "apps.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
```

### `apps/api/config.py`
```python
import os
from pydantic import BaseSettings, Field, AnyUrl

class Settings(BaseSettings):
    DEBUG: bool = Field(default=False, env="DEBUG")
    DATABASE_URL: AnyUrl = Field(..., env="DATABASE_URL")
    REDIS_URL: AnyUrl = Field(..., env="REDIS_URL")
    ANTHROPIC_API_KEY: str = Field(..., env="ANTHROPIC_API_KEY")
    DAILY_TOKEN_CAP: int = Field(default=100_000, env="DAILY_TOKEN_CAP")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### `apps/api/models/__init__.py`
```python
# Export all models for easy import
from .document import Document
from .conversation import Conversation
from .message import Message
from .usage_log import UsageLog
```

### `apps/api/models/document.py`
```python
import sqlalchemy as sa
from sqlalchemy.orm import relationship
from . import Base

class Document(Base):
    __tablename__ = "documents"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    filename = sa.Column(sa.String, nullable=False)
    file_hash = sa.Column(sa.String, nullable=False, index=True)
    page_count = sa.Column(sa.Integer, nullable=False)
    extracted_text = sa.Column(sa.Text, nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    conversations = relationship("Conversation", back_populates="document", cascade="all, delete-orphan")
```

### `apps/api/models/conversation.py`
```python
import sqlalchemy as sa
from sqlalchemy.orm import relationship
from . import Base

class Conversation(Base):
    __tablename__ = "conversations"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    document_id = sa.Column(sa.Integer, sa.ForeignKey("documents.id"), nullable=False)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    document = relationship("Document", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
```

### `apps/api/models/message.py`
```python
import sqlalchemy as sa
from sqlalchemy.orm import relationship
from . import Base

class Message(Base):
    __tablename__ = "messages"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    conversation_id = sa.Column(sa.Integer, sa.ForeignKey("conversations.id"), nullable=False)
    role = sa.Column(sa.Enum("user", "assistant", name="role_enum"), nullable=False)
    content = sa.Column(sa.Text, nullable=False)
    tokens_used = sa.Column(sa.Integer, nullable=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    conversation = relationship("Conversation", back_populates="messages")
```

### `apps/api/models/usage_log.py`
```python
import sqlalchemy as sa
from . import Base

class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    endpoint = sa.Column(sa.String, nullable=False)
    tokens_in = sa.Column(sa.Integer, nullable=False)
    tokens_out = sa.Column(sa.Integer, nullable=False)
    cost_usd = sa.Column(sa.Numeric(10, 6), nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
```

### `apps/api/schemas/__init__.py`
```python
# Export all schemas for easy import
from .document import DocumentCreate, DocumentResponse, DocumentSummary, RedFlag, Question, SummaryResponse, RedFlagsResponse, QuestionsResponse
from .conversation import MessageCreate, MessageResponse, ConversationCreate, ConversationResponse
from .usage_log import UsageLogResponse
```

### `apps/api/schemas/document.py`
```python
from pydantic import BaseModel
from typing import List

class DocumentCreate(BaseModel):
    filename: str
    # file uploaded via multipart, not in JSON body

class DocumentResponse(BaseModel):
    id: int
    filename: str
    page_count: int
    preview: str

    class Config:
        orm_mode = True

class DocumentSummary(BaseModel):
    parties: List[str]
    term: str
    obligations: List[str]
    risks: List[str]
    plain_summary: str

class RedFlag(BaseModel):
    clause_text: str
    page: int
    severity: str
    explanation: str
    suggestion: str

class Question(BaseModel):
    question: str

class SummaryResponse(BaseModel):
    summary: DocumentSummary

class RedFlagsResponse(BaseModel):
    red_flags: List[RedFlag]

class QuestionsResponse(BaseModel):
    questions: List[Question]
```

### `apps/api/schemas/conversation.py`
```python
from pydantic import BaseModel
from typing import List, Optional

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    tokens_used: Optional[int]
    created_at: str

    class Config:
        orm_mode = True

class ConversationCreate(BaseModel):
    document_id: int

class ConversationResponse(BaseModel):
    id: int
    document_id: int
    created_at: str

    class Config:
        orm_mode = True
```

### `apps/api/schemas/usage_log.py`
```python
from pydantic import BaseModel

class UsageLogResponse(BaseModel):
    user_id: int
    endpoint: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    created_at: str

    class Config:
        orm_mode = True
```

### `apps/api/routers/__init__.py`
```python
# Empty – routers are imported individually
```

### `apps/api/routers/documents.py`
```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models, schemas, services
from ..services import pdf_extract, claude_client, usage
from ..services.streaming import EventSourceResponse

router = APIRouter()

# Placeholder DB dependency – replace with actual implementation
async def get_db() -> AsyncSession:
    raise NotImplementedError

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = Query(..., description="Authenticated user id"),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    contents = await file.read()
    extracted_text, page_count = await pdf_extract.extract_text(contents)
    file_hash = pdf_extract.sha256_hash(contents)
    existing = await services.document.get_by_hash(db, user_id=user_id, file_hash=file_hash)
    if existing:
        return schemas.DocumentResponse.from_orm(existing)
    doc = await services.document.create(
        db,
        user_id=user_id,
        filename=file.filename,
        file_hash=file_hash,
        page_count=page_count,
        extracted_text=extracted_text,
    )
    await usage.log_endpoint(db, user_id, "upload", usage_tokens=0)
    return schemas.DocumentResponse.from_orm(doc)

@router.post("/{doc_id}/summary", response_model=schemas.SummaryResponse)
async def document_summary(
    doc_id: int,
    stream: bool = Query(False),
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    document = await services.document.get(db, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    prompt = await services.prompts.render_summary(document.extracted_text)
    if stream:
        async def generator():
            async for token in claude_client.stream_completion(prompt, user_id):
                yield {"event": "token", "data": {"text": token}}
            await usage.log_endpoint(db, user_id, "summary", usage_tokens=0)
        return EventSourceResponse(generator())
    else:
        response = await claude_client.complete(prompt, user_id)
        await usage.log_endpoint(db, user_id, "summary", usage_tokens=0)
        return schemas.SummaryResponse(summary=response)

@router.post("/{doc_id}/red-flags", response_model=schemas.RedFlagsResponse)
async def red_flags(
    doc_id: int,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    document = await services.document.get(db, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    prompt = await services.prompts.render_red_flags(document.extracted_text)
    response = await claude_client.complete(prompt, user_id)
    await usage.log_endpoint(db, user_id, "red_flags", usage_tokens=0)
    return schemas.RedFlagsResponse(red_flags=response)

@router.post("/{doc_id}/questions", response_model=schemas.QuestionsResponse)
async def document_questions(
    doc_id: int,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    document = await services.document.get(db, doc_id, user_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    prompt = await services.prompts.render_questions(document.extracted_text)
    response = await claude_client.complete(prompt, user_id)
    await usage.log_endpoint(db, user_id, "questions", usage_tokens=0)
    return schemas.QuestionsResponse(questions=response)
```

### `apps/api/routers/conversations.py`
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, services
from ..services.streaming import EventSourceResponse
from ..services import claude_client, usage

router = APIRouter()

async def get_db() -> AsyncSession:
    raise NotImplementedError

@router.post("/{conv_id}/messages", response_model=schemas.MessageResponse)
async def post_message(
    conv_id: int,
    message: schemas.MessageCreate,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    stream: bool = Query(False),
):
    conversation = await services.conversation.get(db, conv_id, user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Persist user message
    user_msg = await services.message.create(
        db,
        conversation_id=conv_id,
        role="user",
        content=message.content,
    )
    # Build context
    context_prompt = await services.context.build_context(db, conversation, user_msg)
    # Render chat prompt
    prompt = await services.prompts.render_chat(context_prompt)
    if stream:
        async def gen():
            async for token in claude_client.stream_completion(prompt, user_id):
                yield {"event": "token", "data": {"text": token}}
            await usage.log_endpoint(db, user_id, "chat", usage_tokens=0)
        return EventSourceResponse(gen())
    else:
        resp = await claude_client.complete(prompt, user_id)
        assistant_msg = await services.message.create(
            db,
            conversation_id=conv_id,
            role="assistant",
            content=resp,
            tokens_used=0,
        )
        await usage.log_endpoint(db, user_id, "chat", usage_tokens=0)
        return schemas.MessageResponse.from_orm(assistant_msg)

@router.get("/{conv_id}/messages", response_model=list[schemas.MessageResponse])
async def get_messages(
    conv_id: int,
    limit: int = Query(100),
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    msgs = await services.message.list_by_conversation(db, conv_id, limit)
    return [schemas.MessageResponse.from_orm(m) for m in msgs]
```

### `apps/api/routers/usage.py`
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..services import usage

router = APIRouter()

async def get_db() -> AsyncSession:
    raise NotImplementedError

@router.get("/", response_model=list[dict])
async def get_usage(user_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    logs = await usage.get_user_usage(db, user_id)
    return [log.__dict__ for log in logs]
```

### `apps/api/services/__init__.py`
```python
# Export service modules for convenient imports
from . import pdf_extract, claude_client, context, usage, streaming, prompts
```

### `apps/api/services/pdf_extract.py`
```python
import hashlib
import io
import pdfplumber

async def extract_text(file_bytes: bytes) -> tuple[str, int]:
    """Extracts text from a PDF and returns combined text with page markers and page count."""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = []
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append(f"\n---PAGE {i}---\n{text}")
        combined = "".join(pages)
        return combined, len(pdf.pages)

def sha256_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
```

### `apps/api/services/claude_client.py`
```python
from anthropic import Anthropic
from ..config import settings

client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def complete(prompt: str, user_id: int):
    response = client.completions.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=2048,
        temperature=0.0,
        messages=[{"role": "user", "content": prompt}],
    )
    # In a real implementation you would extract token usage from response
    return response.completion

async def stream_completion(prompt: str, user_id: int):
    with client.completions.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=2048,
        temperature=0.0,
        stream=True,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for event in stream:
            if hasattr(event, "delta") and event.delta:
                yield event.delta
```

### `apps/api/services/context.py`
```python
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Message

MAX_TOKENS = 50_000

async def build_context(db: AsyncSession, conversation, user_message):
    # Simple context builder – truncates large docs, includes last 10 messages
    doc_text = conversation.document.extracted_text
    if len(doc_text) > MAX_TOKENS:
        doc_text = doc_text[:MAX_TOKENS]
    recent_res = await db.execute(
        Message.__table__.select()
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent = recent_res.fetchall()
    prompt = f"Document excerpt:\n{doc_text}\n\nRecent conversation:\n"
    for msg in reversed(recent):
        prompt += f"{msg.role}: {msg.content}\n"
    prompt += f"user: {user_message.content}\n"
    return prompt
```

### `apps/api/services/usage.py`
```python
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import UsageLog
from datetime import datetime

def estimate_cost(tokens: int) -> float:
    # Approx $3 per million tokens (Claude 3.5 Sonnet)
    return (tokens / 1_000_000) * 3.0

async def log_endpoint(db: AsyncSession, user_id: int, endpoint: str, usage_tokens: int):
    cost = estimate_cost(usage_tokens)
    log = UsageLog(
        user_id=user_id,
        endpoint=endpoint,
        tokens_in=usage_tokens,
        tokens_out=0,
        cost_usd=cost,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    await db.commit()

async def get_user_usage(db: AsyncSession, user_id: int):
    result = await db.execute(UsageLog.__table__.select().where(UsageLog.user_id == user_id))
    return result.scalars().all()
```

### `apps/api/services/streaming.py`
```python
from fastapi.responses import StreamingResponse
import json

class EventSourceResponse(StreamingResponse):
    def __init__(self, event_generator, **kwargs):
        async def sse_gen():
            async for ev in event_generator:
                payload = f"event: {ev['event']}\n"
                payload += f"data: {json.dumps(ev['data'])}\n\n"
                yield payload.encode("utf-8")
        super().__init__(sse_gen(), media_type="text/event-stream", **kwargs)
```

### `apps/api/services/prompts.py`
```python
from jinja2 import Environment, FileSystemLoader, select_autoescape
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parents[2] / "prompts"

env = Environment(
    loader=FileSystemLoader(str(BASE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

def render_template(name: str, **ctx) -> str:
    tmpl = env.get_template(name)
    return tmpl.render(**ctx)

async def render_summary(document_text: str) -> str:
    return render_template("summary.jinja2", document=document_text, system_prompt=await get_system())

async def render_red_flags(document_text: str) -> str:
    return render_template("red_flags.jinja2", document=document_text, system_prompt=await get_system())

async def render_questions(document_text: str) -> str:
    return render_template("questions.jinja2", document=document_text, system_prompt=await get_system())

async def render_chat(context: str) -> str:
    return render_template("chat.jinja2", context=context, system_prompt=await get_system())

async def get_system() -> str:
    # Load system prompt from file
    path = BASE_DIR / "system.md"
    return path.read_text()
```

### `apps/api/prompts/system.md`
```markdown
You are Counsel, a legal assistant for Kenyan SMEs. You explain documents in plain English, flag risky clauses, and suggest lawyer questions. You are NOT a lawyer and must state this when giving legal opinions. Always cite page numbers using the format [p. N]. Keep responses concise and practical.
```

### `apps/api/prompts/summary.jinja2`
```jinja2
{{ system_prompt }}

Summarise this Kenyan legal/business document in plain English for an SME owner with no legal training. Return JSON:
{
  "parties": [],
  "term": "",
  "obligations": [],
  "risks": [],
  "plain_summary": "..."
}

Document text:
{{ document }}
```

### `apps/api/prompts/red_flags.jinja2`
```jinja2
{{ system_prompt }}

Identify clauses in this document that are unusual, risky, or unfavourable to an SME. For each, provide: the clause text, page number, severity (low|med|high), plain explanation, and what to negotiate.

Document text:
{{ document }}
```

### `apps/api/prompts/questions.jinja2`
```jinja2
{{ system_prompt }}

Given this document, list the most important questions an SME should ask a lawyer before signing. Be specific to this document. Return a JSON list of question strings.

Document text:
{{ document }}
```

### `apps/api/prompts/chat.jinja2`
```jinja2
{{ system_prompt }}

You are continuing a multi‑turn conversation about the document. Use the provided context (document excerpts and recent messages) to answer the user. Respond in plain English and cite pages when relevant.

Context:
{{ context }}
```

---

## Frontend (`apps/web/`)

### `apps/web/vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### `apps/web/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src"]
}
```

### `apps/web/tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### `apps/web/src/App.tsx`
```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DocumentPage from "./pages/DocumentPage";
import UsagePage from "./pages/UsagePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### `apps/web/src/main.tsx`
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `apps/web/src/routes/index.tsx`
```tsx
// Placeholder for future route extensions
export {};
```

### `apps/web/src/pages/HomePage.tsx`
```tsx
import React from "react";
import UploadZone from "../components/UploadZone";

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Counsel AI – Document Analyzer</h1>
      <UploadZone />
    </div>
  );
};

export default HomePage;
```

### `apps/web/src/pages/DocumentPage.tsx`
```tsx
import React, { Suspense } from "react";
import { useParams } from "react-router-dom";
import RedFlagList from "../components/RedFlagList";
import ChatPanel from "../components/ChatPanel";
import { useDocument } from "../hooks/useApi";

const PdfViewer = React.lazy(() => import("../components/PdfViewer"));

const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useDocument(id!);

  if (isLoading) return <div>Loading...</div>;
  if (!doc) return <div>Document not found.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      <div className="md:w-1/2">
        <Suspense fallback={<div>Loading PDF…</div>}>
          <PdfViewer fileUrl={doc.fileUrl} />
        </Suspense>
      </div>
      <div className="md:w-1/2 flex flex-col gap-4">
        <section>
          <h2 className="text-xl font-semibold">Summary</h2>
          {/* Summary component to be added */}
        </section>
        <section>
          <h2 className="text-xl font-semibold">Red Flags</h2>
          <RedFlagList documentId={Number(id)} />
        </section>
        <section className="flex-1">
          <h2 className="text-xl font-semibold">Chat</h2>
          <ChatPanel documentId={Number(id)} />
        </section>
      </div>
    </div>
  );
};

export default DocumentPage;
```

### `apps/web/src/pages/UsagePage.tsx`
```tsx
import React from "react";
import UsageMeter from "../components/UsageMeter";

const UsagePage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Token Usage</h1>
      <UsageMeter />
    </div>
  );
};

export default UsagePage;
```

### `apps/web/src/components/UploadZone.tsx`
```tsx
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const UploadZone: React.FC = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    (file: File) => {
      const form = new FormData();
      form.append("file", file);
      // Replace with real auth handling
      return axios.post(`/api/documents/upload?user_id=1`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["documents"]);
      },
    }
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type !== "application/pdf") {
        alert("Only PDF files are allowed.");
        return;
      }
      mutation.mutate(file);
    });
  }, [mutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed p-8 text-center ${isDragActive ? "bg-gray-100" : ""}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the PDF here …</p>
      ) : (
        <p>Drag ‘n’ drop a PDF here, or click to select one</p>
      )}
      {mutation.isLoading && <p>Uploading…</p>}
    </div>
  );
};

export default UploadZone;
```

### `apps/web/src/components/PdfViewer.tsx`
```tsx
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type Props = { fileUrl: string };

const PdfViewer: React.FC<Props> = ({ fileUrl }) => {
  const [numPages, setNumPages] = useState(0);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);

  return (
    <Document file={fileUrl} onLoadSuccess={onLoadSuccess} loading="Loading PDF…">
      {Array.from(new Array(numPages), (_, index) => (
        <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
      ))}
    </Document>
  );
};

export default PdfViewer;
```

### `apps/web/src/components/RedFlagList.tsx`
```tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type RedFlag = {
  clause_text: string;
  page: number;
  severity: string;
  explanation: string;
  suggestion: string;
};

interface Props {
  documentId: number;
}

const RedFlagList: React.FC<Props> = ({ documentId }) => {
  const { data, isLoading, error } = useQuery<RedFlag[]>(
    ["redFlags", documentId],
    async () => {
      const res = await axios.get(`/api/documents/${documentId}/red-flags?user_id=1`);
      return res.data.red_flags;
    }
  );

  if (isLoading) return <div>Loading red flags…</div>;
  if (error) return <div>Failed to load red flags.</div>;

  return (
    <ul className="space-y-2">
      {data!.map((flag, idx) => (
        <li key={idx} className="border rounded p-2">
          <div className="font-medium">Severity: {flag.severity}</div>
          <div className="text-sm">Page: {flag.page}</div>
          <p className="mt-1">{flag.clause_text}</p>
          <p className="italic text-gray-600">{flag.explanation}</p>
          <p className="text-gray-800">Suggestion: {flag.suggestion}</p>
        </li>
      ))}
    </ul>
  );
};

export default RedFlagList;
```

### `apps/web/src/components/StreamingMessage.tsx`
```tsx
import React, { useEffect, useState } from "react";

type Props = { streamUrl: string };

const StreamingMessage: React.FC<Props> = ({ streamUrl }) => {
  const [content, setContent] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const source = new EventSource(streamUrl);
    source.addEventListener("token", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setContent((prev) => prev + data.text);
    });
    source.addEventListener("done", () => {
      setCompleted(true);
      source.close();
    });
    return () => {
      source.close();
    };
  }, [streamUrl]);

  return (
    <div className="prose prose-sm" style={{ whiteSpace: "pre-wrap" }}>
      {content}
      {!completed && <span className="animate-pulse">|</span>}
    </div>
  );
};

export default StreamingMessage;
```

### `apps/web/src/components/ChatPanel.tsx`
```tsx
import React, { useState } from "react";
import axios from "axios";
import StreamingMessage from "./StreamingMessage";

type Props = { documentId: number };

const ChatPanel: React.FC<Props> = ({ documentId }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const resp = await axios.post(
      `/api/conversations/${documentId}/messages?user_id=1&stream=true`,
      { content: userMsg.content }
    );
    // Expecting backend to return {stream_url: "..."}
    setStreamUrl(resp.data.stream_url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role === "assistant" ? "text-blue-600" : "text-gray-800"}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {streamUrl && <StreamingMessage streamUrl={streamUrl} />}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
```

### `apps/web/src/components/UsageMeter.tsx`
```tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type Usage = { tokens_used: number; cap: number };

const UsageMeter: React.FC = () => {
  const { data, isLoading } = useQuery<Usage>(["usage"], async () => {
    const res = await axios.get(`/usage?user_id=1`);
    return { tokens_used: res.data.tokens_used, cap: res.data.cap };
  }, { refetchInterval: 60_000 });

  if (isLoading) return <div>Loading usage…</div>;

  const percent = Math.min(100, (data!.tokens_used / data!.cap) * 100);

  return (
    <div className="w-full bg-gray-200 rounded h-6">
      <div className="bg-green-500 h-6 rounded" style={{ width: `${percent}%` }} />
      <div className="text-center text-sm -mt-5 text-white">
        {data!.tokens_used} / {data!.cap} tokens used
      </div>
    </div>
  );
};

export default UsageMeter;
```

### `apps/web/src/hooks/useApi.ts`
```tsx
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type DocumentInfo = {
  id: number;
  filename: string;
  page_count: number;
  preview: string;
  fileUrl: string;
};

export const useDocument = (id: string) => {
  return useQuery<DocumentInfo>(["document", id], async () => {
    const res = await axios.get(`/api/documents/${id}?user_id=1`);
    const doc = res.data;
    return { ...doc, fileUrl: `/api/documents/${id}/file` };
  }, { staleTime: 5 * 60 * 1000 });
};
```

### `apps/web/src/api/client.ts`
```ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30_000,
});

export default api;
```

---

## Docker Compose (`docker-compose.yml`)
```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: example
      POSTGRES_DB: Counsel
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    env_file:
      - .env.example
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    command: uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    env_file:
      - .env.example
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  pg_data:
```

---

## `.env.example`
```dotenv
# Backend configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
DATABASE_URL=postgresql+asyncpg://postgres:example@postgres:5432/Counsel
REDIS_URL=redis://redis:6379/0
DAILY_TOKEN_CAP=100000
DEBUG=true

# Frontend (optional for production builds)
VITE_API_BASE_URL=http://localhost:8000
```

---

## Sample PDF Generation (`samples/generate_sample.py`)
```python
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

def create_sample_nda(path: str = "samples/sample-nda.pdf"):
    c = canvas.Canvas(path, pagesize=LETTER)
    width, height = LETTER
    content = """NON-DISCLOSURE AGREEMENT (NDA)\n\nThis Agreement is made between XYZ Ltd (\"Company\") and ABC Enterprises (\"Recipient\").\n\n1. Confidential Information. The Recipient shall keep all confidential information strictly secret.\n2. Term. This Agreement remains in effect for 5 years from the signing date.\n3. Governing Law. The laws of Kenya shall govern this Agreement.\n4. Liability. The Recipient shall be liable for any breach.\n\nSigned:\n\nCompany: _____________________\nRecipient: _____________________\nDate: _____________________"""
    for i, line in enumerate(content.split("\n")):
        c.drawString(72, height - 72 - i * 14, line)
    c.showPage()
    c.save()

if __name__ == "__main__":
    create_sample_nda()
    print("Sample NDA PDF generated.")
```

---

## README (`README.md`)
```markdown
# Counsel AI

[![CI](https://github.com/your-org/counsel-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/counsel-ai/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Node 20+](https://img.shields.io/badge/node-20%2B-success.svg)](https://nodejs.org/)

**Counsel AI** is an AI‑powered legal assistant for Kenyan SMEs. Upload a contract PDF and receive:
- Plain‑English summary
- Red‑flag clause list with severity and suggestions
- A set of lawyer‑question prompts
- Interactive multi‑turn chat with streaming responses

> ⚠️ **Legal disclaimer**: Counsel is *not a lawyer*. All output is for informational purposes only and should be reviewed by a qualified legal professional.

## Quickstart
```bash
# Copy the example environment file and edit as needed
cp .env.example .env

# Start the whole stack
docker compose up --build
```

- API: `http://localhost:8000`
- Web UI: `http://localhost:3000`

## Architecture
```mermaid
flowchart LR
    subgraph Frontend[React SPA]
        FE[Pages & Components]
    end
    subgraph Backend[FastAPI]
        API[Routers]
        SVC[Services]
        DB[(PostgreSQL)]
        REDIS[(Redis)]
        CLAUDE[Anthropic Claude]
    end
    FE -- REST --> API
    API --> SVC
    SVC --> DB
    SVC --> REDIS
    SVC --> CLAUDE
```

## Prompt Design Notes
All prompt templates prepend the system reminder from `prompts/system.md` which states **"You are not a lawyer"**. Summaries, red‑flags, and question lists are returned as JSON for easier consumption on the frontend. The chat endpoint streams tokens via SSE, enabling live‑typing effects.

## Token Cost Estimates (per request)
| Operation | Input tokens | Output tokens | Approx. cost (USD) |
|-----------|--------------|---------------|-------------------|
| Summary | ~10 k | 500 | $0.001 |
| Red‑flags | ~10 k | 800 | $0.0015 |
| Questions | ~10 k | 300 | $0.0008 |
| Chat turn | 1 k | 1 k | $0.001 |

*Pricing based on Claude 3.5 Sonnet (~$3 per million tokens).*

## Development
### Backend
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn apps.api.main:app --reload
```

### Frontend
```bash
cd apps/web
npm install
npm run dev
```

## Testing
```bash
# Backend unit tests
cd apps/api
pytest

# Frontend component tests
cd apps/web
npm run test

# End‑to‑end Playwright tests
cd apps/web
npx playwright test
```

## Sample PDF
Run the helper script to generate a realistic Kenyan NDA for local testing:
```bash
python samples/generate_sample.py
```

The generated file will be located at `samples/sample-nda.pdf`.

---

## Playwright E2E Test (`apps/web/e2e/tests/Counsel.e2e.ts`)
```ts
import { test, expect } from "@playwright/test";
import path from "path";

test("upload PDF, view summary, and chat streaming works", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Upload sample PDF
  const fileInput = page.getByLabel(/PDF only/);
  await fileInput.setInputFiles(path.resolve(__dirname, "../../samples/sample-nda.pdf"));

  // Wait for navigation to document page
  await page.waitForURL(/\/documents\/\d+/);

  // Click Summary tab (assuming a tab exists)
  await page.getByRole("tab", { name: /Summary/i }).click();
  await expect(page.getByText(/plain English summary/i)).toBeVisible();

  // Open Chat tab and send a message
  await page.getByRole("tab", { name: /Chat/i }).click();
  await page.getByPlaceholder("Ask a question…").fill("What does clause 2 mean?");
  await page.getByRole("button", { name: /Send/i }).click();

  // Verify streaming tokens appear
  const chatArea = page.locator(".prose");
  await expect(chatArea).toContainText("clause 2");
});
```

---

*End of repository definition.*
