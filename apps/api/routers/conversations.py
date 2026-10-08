import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models import Conversation, Message, Document
from ..schemas.message import MessageCreate, MessageResponse
from ..services import claude_client, context, usage, prompts, streaming

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/{conv_id}/messages")
async def post_message_stream(
    conv_id: int,
    body: MessageCreate,
    user_id: int = Query(default=1, description="Authenticated user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Multi-turn SSE streaming chat endpoint with memory and document retrieval context."""
    # 1. Fetch conversation and linked document
    stmt = (
        select(Conversation)
        .where(Conversation.id == conv_id, Conversation.user_id == user_id)
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    doc_stmt = select(Document).where(Document.id == conv.document_id)
    doc_res = await db.execute(doc_stmt)
    document = doc_res.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document linked to conversation not found.")

    # 2. Check daily token limit
    estimated_tokens_in = usage.count_tokens(body.content) + 500
    await usage.check_daily_cap(db, user_id, estimated_tokens=estimated_tokens_in)

    # 3. Persist user message
    user_msg_tokens = usage.count_tokens(body.content)
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=body.content,
        tokens_used=user_msg_tokens,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # 4. Build context: top relevant document chunks + last 10 turns
    doc_excerpt, history_str = await context.build_conversation_context(
        db,
        conversation_id=conv_id,
        user_message=body.content,
        extracted_text=document.extracted_text,
        max_turns=10,
    )

    prompt = prompts.render_chat(
        document_excerpt=doc_excerpt,
        history=history_str,
        user_message=body.content,
    )

    tokens_in = usage.count_tokens(prompt)

    # 5. SSE generator
    async def sse_chat_generator():
        full_assistant_reply = ""
        try:
            async for token in claude_client.stream_chat_completion(prompt):
                full_assistant_reply += token
                yield streaming.format_sse_event("token", {"text": token})
        except Exception as e:
            logger.error("Error during Claude chat streaming", error=str(e))
            yield streaming.format_sse_event("error", {"error": f"LLM streaming error: {str(e)}"})
            return

        tokens_out = usage.count_tokens(full_assistant_reply)
        total_tokens = tokens_in + tokens_out

        # Persist assistant message in DB
        assistant_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=full_assistant_reply,
            tokens_used=tokens_out,
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        # Record usage
        await usage.record_usage(
            db,
            user_id=user_id,
            endpoint=f"/conversations/{conv_id}/messages",
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )

        yield streaming.format_sse_event(
            "done",
            {"message_id": assistant_msg.id, "tokens_used": total_tokens}
        )

    return streaming.create_event_source_response(sse_chat_generator())

@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conv_id: int,
    user_id: int = Query(default=1),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Fetch chronological message history for the conversation."""
    # Verify ownership
    conv_stmt = select(Conversation).where(Conversation.id == conv_id, Conversation.user_id == user_id)
    conv_res = await db.execute(conv_stmt)
    if not conv_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found.")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [MessageResponse.model_validate(m) for m in messages]
