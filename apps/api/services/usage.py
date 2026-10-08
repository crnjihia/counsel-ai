import structlog
from datetime import datetime, date, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import tiktoken
import redis.asyncio as aioredis
from typing import Optional, Tuple
from ..config import settings
from ..models.usage_log import UsageLog
from ..schemas.usage_log import UsageSummaryResponse, UsageLogResponse

logger = structlog.get_logger(__name__)

# Initialize tokenizer encoder
try:
    _encoder = tiktoken.get_encoding("cl100k_base")
except Exception:
    _encoder = None

def count_tokens(text: str) -> int:
    """Accurately count tokens using tiktoken (fallback to char length // 4)."""
    if not text:
        return 0
    if _encoder:
        return len(_encoder.encode(text))
    return max(1, len(text) // 4)

def calculate_cost(tokens_in: int, tokens_out: int) -> float:
    """Calculate USD cost based on Claude 3.5 Sonnet pricing:
    $3.00 per 1M input tokens, $15.00 per 1M output tokens.
    """
    cost_in = (tokens_in / 1_000_000.0) * 3.0
    cost_out = (tokens_out / 1_000_000.0) * 15.0
    return round(cost_in + cost_out, 6)

async def get_redis_client() -> Optional[aioredis.Redis]:
    """Get Redis client instance or None if not configured/available."""
    try:
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        await client.ping()
        return client
    except Exception as e:
        logger.warning("Redis connection unavailable, falling back to DB for rate limits", error=str(e))
        return None

async def check_daily_cap(db: AsyncSession, user_id: int, estimated_tokens: int = 0) -> int:
    """Verify user has not exceeded their daily token cap. Raises 429 if exceeded."""
    today_str = date.today().isoformat()
    redis_key = f"token_usage:{user_id}:{today_str}"
    
    redis_client = await get_redis_client()
    current_tokens = 0

    if redis_client:
        try:
            val = await redis_client.get(redis_key)
            current_tokens = int(val) if val else 0
            await redis_client.aclose()
        except Exception:
            redis_client = None

    if not redis_client:
        # Fallback to database
        start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        stmt = (
            select(func.coalesce(func.sum(UsageLog.tokens_in + UsageLog.tokens_out), 0))
            .where(UsageLog.user_id == user_id, UsageLog.created_at >= start_of_day)
        )
        result = await db.execute(stmt)
        current_tokens = int(result.scalar() or 0)

    if current_tokens + estimated_tokens > settings.DAILY_TOKEN_CAP:
        logger.warning(
            "User exceeded daily token cap",
            user_id=user_id,
            current=current_tokens,
            cap=settings.DAILY_TOKEN_CAP
        )
        raise HTTPException(
            status_code=429,
            detail=f"Daily token quota exceeded. Used {current_tokens} of {settings.DAILY_TOKEN_CAP} daily tokens."
        )

    return current_tokens

async def record_usage(
    db: AsyncSession,
    user_id: int,
    endpoint: str,
    tokens_in: int,
    tokens_out: int
) -> UsageLog:
    """Log token usage to database and update Redis counter."""
    cost = calculate_cost(tokens_in, tokens_out)
    log = UsageLog(
        user_id=user_id,
        endpoint=endpoint,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    # Increment Redis counter
    today_str = date.today().isoformat()
    redis_key = f"token_usage:{user_id}:{today_str}"
    redis_client = await get_redis_client()
    if redis_client:
        try:
            pipe = redis_client.pipeline()
            total_tokens = tokens_in + tokens_out
            pipe.incrby(redis_key, total_tokens)
            pipe.expire(redis_key, 86400 * 2)  # 2 days TTL
            await pipe.execute()
            await redis_client.aclose()
        except Exception as e:
            logger.warning("Failed to record usage in Redis", error=str(e))

    logger.info(
        "Usage recorded",
        user_id=user_id,
        endpoint=endpoint,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost
    )
    return log

async def get_user_usage_summary(db: AsyncSession, user_id: int) -> UsageSummaryResponse:
    """Fetch usage metrics for user this month."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_of_month = datetime(now.year, now.month, 1)
    start_of_day = datetime(now.year, now.month, now.day)

    # Monthly totals
    stmt_month = (
        select(
            func.coalesce(func.sum(UsageLog.tokens_in + UsageLog.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(UsageLog.cost_usd), 0.0).label("cost")
        )
        .where(UsageLog.user_id == user_id, UsageLog.created_at >= start_of_month)
    )
    res_month = await db.execute(stmt_month)
    month_tokens, month_cost = res_month.one()

    # Daily totals
    stmt_day = (
        select(func.coalesce(func.sum(UsageLog.tokens_in + UsageLog.tokens_out), 0))
        .where(UsageLog.user_id == user_id, UsageLog.created_at >= start_of_day)
    )
    res_day = await db.execute(stmt_day)
    day_tokens = res_day.scalar() or 0

    # Recent logs
    stmt_logs = (
        select(UsageLog)
        .where(UsageLog.user_id == user_id)
        .order_by(UsageLog.created_at.desc())
        .limit(50)
    )
    res_logs = await db.execute(stmt_logs)
    logs = res_logs.scalars().all()

    return UsageSummaryResponse(
        user_id=user_id,
        total_tokens_month=int(month_tokens),
        total_cost_usd_month=round(float(month_cost), 4),
        daily_tokens_used=int(day_tokens),
        daily_token_cap=settings.DAILY_TOKEN_CAP,
        logs=[UsageLogResponse.model_validate(l) for l in logs]
    )
