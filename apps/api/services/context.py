import re
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import Message, Conversation, Document
from .usage import count_tokens

MAX_DOCUMENT_TOKENS = 50_000
CHUNK_TOKEN_SIZE = 800

def split_into_chunks(text: str, chunk_size_tokens: int = CHUNK_TOKEN_SIZE) -> List[str]:
    """Split text into reasonable chunks while preserving page boundaries where possible."""
    # Split primarily by page markers
    pages = re.split(r"(\n---PAGE \d+---\n)", text)
    chunks = []
    current_chunk = ""

    for part in pages:
        if not part:
            continue
        part_tokens = count_tokens(part)
        if count_tokens(current_chunk) + part_tokens > chunk_size_tokens and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = part
        else:
            current_chunk += part

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text]

def rank_chunks_by_query(chunks: List[str], query: str, top_k: int = 5) -> List[str]:
    """Rank chunks using term frequency-inverse term matching on query keywords."""
    query_words = set(re.findall(r"\w+", query.lower()))
    # Remove minimal stopwords
    stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "is", "was", "are"}
    keywords = [w for w in query_words if w not in stop_words and len(w) > 2]

    if not keywords:
        return chunks[:top_k]

    scored = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = sum(chunk_lower.count(k) for k in keywords)
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for score, chunk in scored[:top_k]]

async def retrieve_document_context(doc_text: str, user_query: str) -> str:
    """Retrieve top document context based on token budget and query relevance."""
    total_tokens = count_tokens(doc_text)
    if total_tokens <= MAX_DOCUMENT_TOKENS:
        return doc_text

    chunks = split_into_chunks(doc_text)
    top_chunks = rank_chunks_by_query(chunks, user_query, top_k=5)
    return "\n\n[...]\n\n".join(top_chunks)

async def build_conversation_context(
    db: AsyncSession,
    conversation_id: int,
    user_message: str,
    extracted_text: str,
    max_turns: int = 10
) -> Tuple[str, str]:
    """Retrieve top relevant document excerpt and last N conversation turns."""
    # 1. Document excerpt
    document_excerpt = await retrieve_document_context(extracted_text, user_message)

    # 2. Last N conversation turns (limit 10)
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_turns)
    )
    result = await db.execute(stmt)
    recent_messages = list(reversed(result.scalars().all()))

    formatted_history = []
    for msg in recent_messages:
        role_label = "User" if msg.role == "user" else "Mshauri (Assistant)"
        formatted_history.append(f"{role_label}: {msg.content}")

    history_str = "\n".join(formatted_history) if formatted_history else "No previous conversation turns."
    return document_excerpt, history_str
