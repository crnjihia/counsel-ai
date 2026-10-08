import sqlalchemy as sa
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    document_id = sa.Column(sa.Integer, sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
