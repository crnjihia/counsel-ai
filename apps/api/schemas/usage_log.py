from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List

class UsageLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    endpoint: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    created_at: datetime

class UsageSummaryResponse(BaseModel):
    user_id: int
    total_tokens_month: int
    total_cost_usd_month: float
    daily_tokens_used: int
    daily_token_cap: int
    logs: List[UsageLogResponse]
