import base64
import hashlib
import hmac
import json
import os

from fastapi import FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import (
    authenticate_user_with_sqlalchemy,
    create_post_with_sqlalchemy,
    create_user_with_sqlalchemy,
    delete_post_with_sqlalchemy,
    ensure_database_schema,
    fetch_posts_with_sqlalchemy,
    get_post_with_sqlalchemy,
    get_user_by_id_with_sqlalchemy,
    update_post_with_sqlalchemy,
)


app = FastAPI(title="Jungle Campus Life AI FAQ Board")

# 브라우저는 포트가 다르면 다른 출처로 보기 때문에, React 개발 서버의 요청을 허용한다.
app.add_middleware(
    CORSMiddleware, # CORS 처리를 해주는 미들웨어
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], # 허용할 프론트엔드 주소
    allow_methods=["*"], # 모든 HTTP 메서드 허용
    allow_headers=["*"], # 모든 요청 헤더 허용
)


AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "local-dev-auth-secret")


class UserResponse(BaseModel):
    """프론트엔드에 보내는 로그인 사용자 정보다.
    password_hash 같은 인증 내부 값은 절대 응답에 포함하지 않는다.
    """

    id: int
    email: str


class AuthRequest(BaseModel):
    """회원가입과 로그인 요청 body의 공통 모양이다.
    OAuth 전 단계로, 이메일/비밀번호 기반 기본 인증 흐름을 먼저 만든다.
    """

    email: str
    password: str


class AuthResponse(BaseModel):
    """회원가입/로그인 성공 시 반환하는 응답 모양이다.
    access_token은 이후 인증이 필요한 API에 보낼 로그인 증표다.
    """

    access_token: str
    token_type: str
    user: UserResponse


class PostResponse(BaseModel):
    """프론트엔드에 보내는 FAQ 게시글 하나의 응답 모양이다.
    지금은 정적 데이터에 쓰고, 나중에는 DB row를 이 모양으로 반환한다.
    React는 이 타입의 필드 이름을 기준으로 화면을 만든다.
    """

    id: int
    title: str
    content: str
    category: str
    author_email: str | None = None


class PostListResponse(BaseModel):
    """GET /posts가 반환하는 게시글 목록 응답 모양이다.
    목록을 posts 키로 감싸면 나중에 total, limit 같은 정보를 추가하기 쉽다. (객체를 반환)
    """

    posts: list[PostResponse]


class PostCreateRequest(BaseModel):
    """POST /posts 요청 body의 모양이다.
    클라이언트가 새 게시글을 만들 때 제목, 본문, 카테고리를 보낸다.
    FastAPI는 이 모델을 기준으로 요청 JSON을 검증한다.
    """

    title: str
    content: str
    category: str


class PostUpdateRequest(BaseModel):
    """PATCH /posts/{post_id} 요청 body의 모양이다.
    수정하려는 필드만 보내면 되고, 빠진 필드는 기존 값을 유지한다.
    """

    title: str | None = None
    content: str | None = None
    category: str | None = None


def _create_access_token(user_id: int) -> str:
    """로그인 성공 시 사용할 간단한 서명 토큰을 만든다.
    payload를 base64로 인코딩하고, 서버 비밀키로 HMAC 서명을 붙인다.
    실제 서비스에서는 만료 시간과 표준 JWT 라이브러리를 함께 사용한다.
    """
    payload = json.dumps({"user_id": user_id}, separators=(",", ":")).encode("utf-8")
    payload_part = base64.urlsafe_b64encode(payload).decode("utf-8").rstrip("=")
    signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_part}.{signature}"


def _read_access_token(access_token: str) -> int | None:
    """서명 토큰에서 user_id를 꺼낸다.
    payload나 서명이 변조되면 None을 반환해 인증 실패로 처리한다.
    다음 CRUD 권한 검사에서도 같은 흐름을 재사용한다.
    """
    try:
        payload_part, signature = access_token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        return None

    padded_payload = payload_part + "=" * (-len(payload_part) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(padded_payload))
        return int(payload["user_id"])
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def _get_bearer_token(authorization: str | None) -> str:
    """Authorization 헤더에서 Bearer 토큰 문자열만 꺼낸다.
    프론트엔드는 보통 `Authorization: Bearer <token>` 형태로 로그인 증표를 보낸다.
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다.",
        )
    return authorization.removeprefix("Bearer ").strip()


def _require_current_user(authorization: str | None) -> dict[str, object]:
    """Authorization 헤더의 토큰으로 현재 로그인 사용자를 확인한다.
    인증이 필요한 게시글 작성/수정/삭제 API가 공통으로 사용한다.
    """
    token = _get_bearer_token(authorization)
    user_id = _read_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
        )

    user = get_user_by_id_with_sqlalchemy(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )
    return user


def _validate_auth_input(email: str, password: str) -> None:
    """회원가입/로그인 입력값을 최소한으로 검증한다.
    지금은 라이브러리 없이 이메일 형태와 비밀번호 길이만 확인한다.
    """
    if "@" not in email or "." not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일 형식이 올바르지 않습니다.",
        )
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호는 6자 이상이어야 합니다.",
        )


@app.on_event("startup")
def prepare_database_schema():
    """앱 시작 시 현재 모델에 필요한 DB 테이블을 준비한다.
    기존 Docker volume은 init.sql을 다시 실행하지 않기 때문에 users 테이블을 보강한다.
    """
    ensure_database_schema()


@app.get("/health")
def health_check():
    """서버가 정상적으로 실행 중인지 확인하는 가장 작은 API다.
    입력은 없고, 정상 상태를 나타내는 JSON을 반환한다.
    프론트엔드나 배포 환경에서 백엔드 연결 확인용으로 사용한다.
    """
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(auth: AuthRequest):
    """새 사용자를 가입시키고 바로 로그인 응답을 반환한다.
    성공하면 user 정보와 access_token을 함께 보내 React가 로그인 상태로 전환한다.
    """
    _validate_auth_input(auth.email, auth.password)

    try:
        user = create_user_with_sqlalchemy(email=auth.email, password=auth.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return {
        "access_token": _create_access_token(user_id=int(user["id"])),
        "token_type": "bearer",
        "user": user,
    }


@app.post("/auth/login", response_model=AuthResponse)
def login(auth: AuthRequest):
    """이메일/비밀번호로 로그인한다.
    인증 성공 시 토큰을 반환하고, 실패 시 401 Unauthorized를 반환한다.
    """
    _validate_auth_input(auth.email, auth.password)
    user = authenticate_user_with_sqlalchemy(email=auth.email, password=auth.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    return {
        "access_token": _create_access_token(user_id=int(user["id"])),
        "token_type": "bearer",
        "user": user,
    }


@app.get("/auth/me", response_model=UserResponse)
def get_current_user(authorization: str | None = Header(default=None)):
    """현재 토큰이 가리키는 로그인 사용자를 반환한다.
    React가 저장한 토큰 검증이나 이후 인증이 필요한 API의 기본 흐름으로 사용한다.
    """
    return _require_current_user(authorization)


@app.get("/posts", response_model=PostListResponse)
def get_posts():
    """FAQ 게시글 목록을 반환하는 첫 번째 게시판 API다.
    SQLAlchemy로 PostgreSQL posts 테이블을 조회하고 응답 모양을 유지한다.
    프론트엔드는 posts 배열을 state에 저장해 목록 화면을 만든다.
    """
    return {"posts": fetch_posts_with_sqlalchemy()}


@app.get("/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: int):
    """게시글 id로 FAQ 게시글 하나를 조회한다.
    React의 상세/수정 흐름에서 특정 글의 최신 값을 확인할 때 사용한다.
    없는 글이면 404를 반환한다.
    """
    post = get_post_with_sqlalchemy(post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )
    return post


@app.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    new_post: PostCreateRequest,
    authorization: str | None = Header(default=None),
):
    """새 FAQ 게시글을 PostgreSQL posts 테이블에 저장한다.
    요청 body는 PostCreateRequest로 검증하고, 생성 결과는 PostResponse로 반환한다.
    Authorization 헤더의 토큰으로 작성자를 확인해 author_id에 연결한다.
    """
    current_user = _require_current_user(authorization)

    return create_post_with_sqlalchemy(
        title=new_post.title,
        content=new_post.content,
        category=new_post.category,
        author_id=int(current_user["id"]),
    )


@app.patch("/posts/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    updated_post: PostUpdateRequest,
    authorization: str | None = Header(default=None),
):
    """게시글 일부 필드를 수정한다.
    Authorization 헤더로 현재 사용자를 확인하고, 작성자 본인만 수정할 수 있게 한다.
    """
    current_user = _require_current_user(authorization)

    try:
        post = update_post_with_sqlalchemy(
            post_id=post_id,
            user_id=int(current_user["id"]),
            title=updated_post.title,
            content=updated_post.content,
            category=updated_post.category,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )
    return post


@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    authorization: str | None = Header(default=None),
):
    """게시글을 삭제한다.
    Authorization 헤더로 현재 사용자를 확인하고, 작성자 본인만 삭제할 수 있게 한다.
    """
    current_user = _require_current_user(authorization)

    try:
        deleted = delete_post_with_sqlalchemy(
            post_id=post_id, user_id=int(current_user["id"])
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
