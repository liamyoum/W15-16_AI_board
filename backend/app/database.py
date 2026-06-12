from collections.abc import Generator
import hashlib
import os
import secrets

from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.models import Base, Comment, Post, User


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


def ensure_database_schema() -> None:
    """현재 SQLAlchemy 모델 기준으로 필요한 테이블을 준비한다.
    기존 Docker volume은 init.sql을 다시 실행하지 않으므로 코드에서도 테이블을 보강한다.
    학습용 방식이며, 실제 서비스에서는 Alembic 같은 마이그레이션 도구를 쓴다.
    """
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        # 기존 Docker volume의 posts 테이블에는 새 컬럼이 없을 수 있어 로컬 학습용으로 보강한다.
        connection.execute(
            text(
                "ALTER TABLE posts "
                "ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            )
        )


def _normalize_email(email: str) -> str:
    """이메일 비교가 흔들리지 않도록 앞뒤 공백을 제거하고 소문자로 맞춘다."""
    return email.strip().lower()


def _hash_password(password: str) -> str:
    """비밀번호 원문을 DB에 저장하지 않기 위해 PBKDF2 해시로 바꾼다.
    salt를 함께 저장해 같은 비밀번호도 사용자마다 다른 해시가 되게 한다.
    오늘은 외부 라이브러리 없이 기본 인증 흐름을 이해하는 데 초점을 둔다.
    """
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000
    ).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def _verify_password(password: str, password_hash: str) -> bool:
    """로그인 시 입력한 비밀번호가 저장된 해시와 맞는지 확인한다.
    원문 비밀번호끼리 비교하지 않고, 같은 방식으로 다시 해시한 결과를 비교한다.
    """
    try:
        algorithm, salt, saved_digest = password_hash.split("$", 2)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000
    ).hex()
    return secrets.compare_digest(digest, saved_digest)


def _user_to_dict(user: User) -> dict[str, object]:
    """DB User 객체를 프론트엔드 응답에 필요한 안전한 dict로 바꾼다.
    password_hash는 인증 내부 값이므로 절대 응답에 포함하지 않는다.
    """
    return {"id": user.id, "email": user.email}


def _post_to_dict(post: Post) -> dict[str, object]:
    """DB Post 객체를 프론트엔드 응답에 맞는 dict로 바꾼다.
    author 관계가 있으면 작성자 이메일을 함께 내려 수정/삭제 UI 판단에 사용한다.
    comments 관계가 있으면 댓글 목록도 함께 내려 게시글 아래에 표시한다.
    """
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "category": post.category,
        "author_email": post.author.email if post.author else None,
        "comments": [_comment_to_dict(comment) for comment in post.comments],
    }


def _comment_to_dict(comment: Comment) -> dict[str, object]:
    """DB Comment 객체를 프론트엔드 응답에 맞는 dict로 바꾼다.
    댓글 작성자 이메일을 함께 내려 댓글 목록에서 작성자를 보여준다.
    """
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "content": comment.content,
        "author_email": comment.author.email if comment.author else None,
    }


def create_user_with_sqlalchemy(email: str, password: str) -> dict[str, object]:
    """회원가입 요청으로 새 사용자를 DB에 저장한다.
    중복 이메일이면 ValueError를 발생시켜 API 라우터가 400 응답으로 바꾼다.
    성공하면 프론트엔드에 보여줄 사용자 정보만 반환한다.
    """
    user = User(email=_normalize_email(email), password_hash=_hash_password(password))

    with SessionLocal() as session:
        try:
            session.add(user)
            session.commit()
            session.refresh(user)
            return _user_to_dict(user)
        except IntegrityError as exc:
            session.rollback()
            raise ValueError("이미 가입된 이메일입니다.") from exc


def authenticate_user_with_sqlalchemy(
    email: str, password: str
) -> dict[str, object] | None:
    """로그인 요청의 이메일/비밀번호가 맞는지 확인한다.
    성공하면 사용자 dict를 반환하고, 실패하면 None을 반환한다.
    """
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == _normalize_email(email)))
        if user is None or not _verify_password(password, user.password_hash):
            return None

        return _user_to_dict(user)


def get_user_by_id_with_sqlalchemy(user_id: int) -> dict[str, object] | None:
    """토큰에서 꺼낸 user_id가 실제 DB 사용자와 연결되는지 확인한다."""
    with SessionLocal() as session:
        user = session.get(User, user_id)
        return _user_to_dict(user) if user else None


def fetch_posts_with_sqlalchemy() -> list[dict[str, object]]:
    """SQLAlchemy Session과 Post 모델로 FAQ 게시글 목록을 조회한다.
    응답 모양은 기존 GET /posts와 같게 유지한다.
    DB row를 Post 객체로 받은 뒤 API 응답용 dict로 바꾼다.
    """
    with SessionLocal() as session:
        posts = session.scalars(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.comments).selectinload(Comment.author),
            )
            .order_by(Post.id)
        ).all()

    return [_post_to_dict(post) for post in posts]


def get_post_with_sqlalchemy(post_id: int) -> dict[str, object] | None:
    """id로 게시글 하나를 조회한다.
    없는 id면 None을 반환해 라우터가 404로 바꿀 수 있게 한다.
    """
    with SessionLocal() as session:
        post = session.scalar(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.comments).selectinload(Comment.author),
            )
            .where(Post.id == post_id)
        )
        return _post_to_dict(post) if post else None


def create_post_with_sqlalchemy(
    title: str, content: str, category: str, author_id: int
) -> dict[str, object]:
    """SQLAlchemy로 새 FAQ 게시글을 DB에 저장한다.
    commit으로 INSERT를 확정하고, refresh로 DB가 만든 id를 객체에 반영한다.
    API 응답 모양에 맞게 생성된 Post 객체를 dict로 바꿔 반환한다.
    """
    post = Post(
        title=title, content=content, category=category, author_id=author_id
    )

    with SessionLocal() as session:
        session.add(post)
        session.commit()
        session.refresh(post)

        post = session.scalar(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.comments).selectinload(Comment.author),
            )
            .where(Post.id == post.id)
        )
        return _post_to_dict(post)


def update_post_with_sqlalchemy(
    post_id: int,
    user_id: int,
    title: str | None,
    content: str | None,
    category: str | None,
) -> dict[str, object] | None:
    """게시글을 부분 수정한다.
    작성자 본인만 수정할 수 있게 author_id와 현재 user_id를 비교한다.
    None으로 들어온 필드는 기존 값을 유지한다.
    """
    with SessionLocal() as session:
        post = session.scalar(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.comments).selectinload(Comment.author),
            )
            .where(Post.id == post_id)
        )
        if post is None:
            return None
        if post.author_id != user_id:
            raise PermissionError("게시글 작성자만 수정할 수 있습니다.")

        if title is not None:
            post.title = title
        if content is not None:
            post.content = content
        if category is not None:
            post.category = category

        session.commit()
        session.refresh(post)
        return _post_to_dict(post)


def delete_post_with_sqlalchemy(post_id: int, user_id: int) -> bool:
    """게시글을 삭제한다.
    작성자 본인만 삭제할 수 있게 author_id와 현재 user_id를 비교한다.
    삭제할 글이 없으면 False를 반환해 라우터가 404로 바꿀 수 있게 한다.
    """
    with SessionLocal() as session:
        post = session.get(Post, post_id)
        if post is None:
            return False
        if post.author_id != user_id:
            raise PermissionError("게시글 작성자만 삭제할 수 있습니다.")

        session.delete(post)
        session.commit()
        return True


def create_comment_with_sqlalchemy(
    post_id: int, author_id: int, content: str
) -> dict[str, object] | None:
    """게시글에 댓글을 저장한다.
    없는 게시글이면 None을 반환해 라우터가 404로 바꿀 수 있게 한다.
    댓글 작성자는 Authorization 토큰에서 확인한 사용자 id로 연결한다.
    """
    with SessionLocal() as session:
        post = session.get(Post, post_id)
        if post is None:
            return None

        comment = Comment(post_id=post_id, author_id=author_id, content=content)
        session.add(comment)
        session.commit()
        session.refresh(comment)

        comment = session.scalar(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.id == comment.id)
        )
        return _comment_to_dict(comment)


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
