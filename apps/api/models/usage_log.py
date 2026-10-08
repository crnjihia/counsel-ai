import sqlalchemy as sa
from datetime import datetime
from ..database import Base

class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, nullable=False, index=True)
    endpoint = sa.Column(sa.String(100), nullable=False)
    tokens_in = sa.Column(sa.Integer, nullable=False, default=0)
    tokens_out = sa.Column(sa.Integer, nullable=False, default=0)
    cost_usd = sa.Column(sa.Float, nullable=False, default=0.0)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow, nullable=False, index=True)
