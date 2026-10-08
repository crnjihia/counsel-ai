import sqlalchemy as sa
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Document(Base):
    __tablename__ = "documents"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    filename = sa.Column(sa.String(255), nullable=False)
    file_hash = sa.Column(sa.String(64), nullable=False, index=True)
    page_count = sa.Column(sa.Integer, nullable=False, default=1)
    extracted_text = sa.Column(sa.Text, nullable=False)
    file_path = sa.Column(sa.String(512), nullable=True)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow, nullable=False)

    conversations = relationship("Conversation", back_populates="document", cascade="all, delete-orphan")
