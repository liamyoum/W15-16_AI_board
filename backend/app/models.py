from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """SQLAlchemy 모델들이 상속받는 기준 클래스다.
    Base를 상속한 클래스는 DB 테이블과 매핑되는 모델로 등록된다.
    나중에 여러 테이블 모델이 생기면 모두 이 Base를 공유한다.
    """


class User(Base):
    """users 테이블과 대응되는 SQLAlchemy 모델이다.
    회원가입/로그인에 필요한 이메일과 비밀번호 해시를 저장한다.
    비밀번호 원문은 저장하지 않고 password_hash만 저장한다.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    posts: Mapped[list[Post]] = relationship(back_populates="author")
    comments: Mapped[list[Comment]] = relationship(back_populates="author")


class Post(Base):
    """PostgreSQL posts 테이블과 대응되는 SQLAlchemy 모델이다.
    DB row 하나를 Python 객체 하나처럼 다루기 위한 클래스다.
    author_id로 작성자 User와 연결해 수정/삭제 권한을 확인한다.
    """

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    # DB의 DEFAULT NOW()와 맞춰 INSERT 시 생성 시간을 DB가 넣게 한다.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    author: Mapped[User | None] = relationship(back_populates="posts")
    comments: Mapped[list[Comment]] = relationship(
        back_populates="post", cascade="all, delete-orphan", order_by="Comment.id"
    )


class Comment(Base):
    """comments 테이블과 대응되는 SQLAlchemy 모델이다.
    댓글은 post_id로 게시글에 속하고, author_id로 작성자 User와 연결된다.
    게시글 삭제 시 댓글도 함께 삭제된다.
    """

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    post: Mapped[Post] = relationship(back_populates="comments")
    author: Mapped[User | None] = relationship(back_populates="comments")
