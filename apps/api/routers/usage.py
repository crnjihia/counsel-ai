from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.usage_log import UsageSummaryResponse
from ..services import usage

router = APIRouter()

@router.get("", response_model=UsageSummaryResponse)
async def get_current_user_usage(
    user_id: int = Query(default=1, description="Authenticated user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve user's token consumption, daily limit status, and cost estimate for the current month."""
    summary = await usage.get_user_usage_summary(db, user_id=user_id)
    return summary
