import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Loan(Base):
    __tablename__ = "loans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "lent" or "borrowed"
    amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    status = Column(String, default="pending", nullable=False)  # "pending" or "settled"
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="loans")
