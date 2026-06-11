from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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


# DB를 붙이기 전까지 API 응답 모양을 확인하기 위한 임시 게시글 데이터다.
STATIC_POSTS = [
    {
        "id": 1,
        "title": "정글 캠퍼스 생활 안내는 어디서 확인하나요?",
        "content": "캠퍼스 생활 안내 Notion 페이지를 기준으로 확인합니다.",
        "category": "campus-life",
    },
    {
        "id": 2,
        "title": "비슷한 FAQ 추천은 어떤 기준으로 동작하나요?",
        "content": "나중에 질문 제목과 본문을 embedding해서 유사한 FAQ를 찾을 예정입니다.",
        "category": "ai-faq",
    },
]


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
    지금은 정적 데이터를 반환하고, 다음 단계에서 DB 조회로 교체한다.
    프론트엔드는 posts 배열을 state에 저장해 목록 화면을 만든다.
    """
    return {"posts": STATIC_POSTS}
