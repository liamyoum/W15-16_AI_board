from collections.abc import Generator
import os

import psycopg
from psycopg.rows import dict_row
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.models import Post


# 로컬 개발 기본값이다. 배포할 때는 DATABASE_URL 환경변수로 실제 DB 주소를 넣는다.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://jungle_user:jungle_password@127.0.0.1:5432/jungle_faq",
)

# SQLAlchemy는 드라이버를 명시한 URL을 사용한다.
# 현재는 psycopg 드라이버를 그대로 쓰되, 위에 SQLAlchemy 계층을 얹는다.
SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace(
    "postgresql://", "postgresql+psycopg://", 1
)

# engine은 SQLAlchemy가 DB와 통신할 때 사용하는 핵심 연결 설정 객체다.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal은 요청마다 사용할 SQLAlchemy Session을 만들어주는 공장 함수다.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_connection():
    """PostgreSQL 연결 객체를 만든다.
    호출한 쪽에서 with 문으로 열고 닫는 방식으로 사용한다.
    dict_row를 써서 조회 결과를 dict처럼 다룰 수 있게 한다.
    """
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def check_database_connection() -> dict[str, str]:
    """DB 연결이 되는지 확인하는 최소 쿼리를 실행한다.
    실제 게시판 기능은 아니고, 연결 설정 검증용 함수다.
    성공하면 현재 DB 이름과 접속 사용자를 반환한다.
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT current_database() AS database_name, current_user AS user_name"
            )
            row = cursor.fetchone()

    if row is None:
        raise RuntimeError("DB 연결 확인 결과가 비어 있습니다.")

    return dict(row)


def fetch_posts_from_db() -> list[dict[str, object]]:
    """posts 테이블에서 FAQ 게시글 목록을 조회한다.
    FastAPI 응답 모델과 맞도록 id, title, content, category만 가져온다.
    지금은 raw SQL 흐름을 보기 위해 SQL 문자열을 직접 실행한다.
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, content, category
                FROM posts
                ORDER BY id
                """
            )
            rows = cursor.fetchall()

    return [dict(row) for row in rows]


def fetch_posts_with_sqlalchemy() -> list[dict[str, object]]:
    """SQLAlchemy Session과 Post 모델로 FAQ 게시글 목록을 조회한다.
    응답 모양은 기존 GET /posts와 같게 유지한다.
    raw SQL 함수와 비교할 수 있도록 이번 단계에서는 새 함수로 둔다.
    """
    with SessionLocal() as session:
        posts = session.scalars(select(Post).order_by(Post.id)).all()

    return [
        {
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "category": post.category,
        }
        for post in posts
    ]


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI Depends에서 사용할 SQLAlchemy Session을 만든다.
    요청 처리 동안 Session 하나를 열고, 끝나면 닫는다.
    아직 라우터에는 연결하지 않고 다음 단계에서 사용한다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_sqlalchemy_connection() -> dict[str, str]:
    """SQLAlchemy 연결 설정이 DB에 접속되는지 확인한다.
    실제 게시판 기능은 아니고, SQLAlchemy 전환 준비용 검증 함수다.
    성공하면 현재 DB 이름과 접속 사용자를 반환한다.
    """
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT current_database() AS database_name, current_user AS user_name")
        ).mappings().one()

    return dict(row)
