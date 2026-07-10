import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class RecurringBill(Base):
    __tablename__ = "recurring_bills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String, default="Subscription", nullable=False)
    frequency = Column(String, default="monthly", nullable=False)  # monthly, yearly, weekly
    next_due_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="recurring_bills")
