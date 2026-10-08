import sqlalchemy as sa
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Message(Base):
    __tablename__ = "messages"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    conversation_id = sa.Column(sa.Integer, sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = sa.Column(sa.String(20), nullable=False)  # "user" or "assistant"
    content = sa.Column(sa.Text, nullable=False)
    tokens_used = sa.Column(sa.Integer, nullable=True, default=0)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")
