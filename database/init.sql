-- FAQ 게시글을 저장하는 첫 번째 테이블이다.
-- 지금은 최소 게시글 목록 조회에 필요한 필드만 만든다.
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 로컬에서 DB 조회 흐름을 확인하기 위한 샘플 데이터다.
-- 같은 제목이 이미 있으면 다시 실행해도 중복으로 넣지 않는다.
INSERT INTO posts (title, content, category)
SELECT
  '정글 캠퍼스 생활 안내는 어디서 확인하나요?',
  '캠퍼스 생활 안내 Notion 페이지를 기준으로 확인합니다.',
  'campus-life'
WHERE NOT EXISTS (
  SELECT 1 FROM posts WHERE title = '정글 캠퍼스 생활 안내는 어디서 확인하나요?'
);

INSERT INTO posts (title, content, category)
SELECT
  '비슷한 FAQ 추천은 어떤 기준으로 동작하나요?',
  '나중에 질문 제목과 본문을 embedding해서 유사한 FAQ를 찾을 예정입니다.',
  'ai-faq'
WHERE NOT EXISTS (
  SELECT 1 FROM posts WHERE title = '비슷한 FAQ 추천은 어떤 기준으로 동작하나요?'
);
