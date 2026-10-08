from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
from .message import MessageResponse

class ConversationCreate(BaseModel):
    document_id: int

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    user_id: int
    created_at: datetime
    messages: Optional[List[MessageResponse]] = []
