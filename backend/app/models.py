from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy 모델들이 상속받는 기준 클래스다.
    Base를 상속한 클래스는 DB 테이블과 매핑되는 모델로 등록된다.
    나중에 여러 테이블 모델이 생기면 모두 이 Base를 공유한다.
    """


class Post(Base):
    """PostgreSQL posts 테이블과 대응되는 SQLAlchemy 모델이다.
    DB row 하나를 Python 객체 하나처럼 다루기 위한 클래스다.
    아직 조회 라우터에는 연결하지 않고, 다음 단계에서 사용한다.
    """

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    # DB의 DEFAULT NOW()와 맞춰 INSERT 시 생성 시간을 DB가 넣게 한다.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
