import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(10, 2), nullable=False)
    current_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    target_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="goals")
