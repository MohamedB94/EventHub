from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint

from app.database import Base


class BruteForce(Base):
    __tablename__ = "bruteforce"
    __table_args__ = (
        UniqueConstraint("email", "ip_address", name="uq_bruteforce_email_ip"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    failed_attempts = Column(Integer, nullable=False, default=0)
    blocked_until = Column(DateTime, nullable=True)
    last_attempt_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    @property
    def attempt_count(self) -> int:
        return self.failed_attempts

    @attempt_count.setter
    def attempt_count(self, value: int):
        self.failed_attempts = value
