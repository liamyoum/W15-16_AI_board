from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import create_post_with_sqlalchemy, fetch_posts_with_sqlalchemy


app = FastAPI(title="Jungle Campus Life AI FAQ Board")

# 브라우저는 포트가 다르면 다른 출처로 보기 때문에, React 개발 서버의 요청을 허용한다.
app.add_middleware(
    CORSMiddleware, # CORS 처리를 해주는 미들웨어
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], # 허용할 프론트엔드 주소
    allow_methods=["*"], # 모든 HTTP 메서드 허용
    allow_headers=["*"], # 모든 요청 헤더 허용
)


class PostResponse(BaseModel):
    """프론트엔드에 보내는 FAQ 게시글 하나의 응답 모양이다.
    지금은 정적 데이터에 쓰고, 나중에는 DB row를 이 모양으로 반환한다.
    React는 이 타입의 필드 이름을 기준으로 화면을 만든다.
    """

    id: int
    title: str
    content: str
    category: str


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


@app.get("/health")
def health_check():
    """서버가 정상적으로 실행 중인지 확인하는 가장 작은 API다.
    입력은 없고, 정상 상태를 나타내는 JSON을 반환한다.
    프론트엔드나 배포 환경에서 백엔드 연결 확인용으로 사용한다.
    """
    return {"status": "ok"}


@app.get("/posts", response_model=PostListResponse)
def get_posts():
    """FAQ 게시글 목록을 반환하는 첫 번째 게시판 API다.
    SQLAlchemy로 PostgreSQL posts 테이블을 조회하고 응답 모양을 유지한다.
    프론트엔드는 posts 배열을 state에 저장해 목록 화면을 만든다.
    """
    return {"posts": fetch_posts_with_sqlalchemy()}


@app.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(new_post: PostCreateRequest):
    """새 FAQ 게시글을 PostgreSQL posts 테이블에 저장한다.
    요청 body는 PostCreateRequest로 검증하고, 생성 결과는 PostResponse로 반환한다.
    DB가 만든 id를 포함해 프론트엔드가 바로 사용할 수 있는 모양으로 응답한다.
    """
    return create_post_with_sqlalchemy(
        title=new_post.title,
        content=new_post.content,
        category=new_post.category,
    )
