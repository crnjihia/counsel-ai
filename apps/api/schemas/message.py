from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: str
    content: str
    tokens_used: Optional[int] = 0
    created_at: datetime
