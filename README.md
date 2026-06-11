# Jungle Campus Life AI FAQ Board

크래프톤 정글 캠퍼스 생활 안내를 기반으로 만드는 AI FAQ 게시판입니다.

사용자가 캠퍼스 생활 관련 질문을 검색하고, 기존 FAQ를 확인하며, 필요한 경우 새 질문을 게시할 수 있도록 돕는 것을 목표로 합니다. 이후에는 RAG 기반 AI 에이전트가 관련 근거를 찾아 댓글 형태로 답변을 제안하는 구조까지 확장합니다.

## Purpose

크래프톤 정글 생활 정보는 Notion 문서에 흩어져 있고, 사용자는 원하는 정보를 빠르게 찾기 어려울 수 있습니다.

이 프로젝트는 캠퍼스 생활 안내 문서를 기준 자료로 삼아 다음 문제를 해결합니다.

1. 자주 묻는 질문을 게시판 형태로 구조화합니다.
2. 검색을 통해 관련 FAQ를 빠르게 찾을 수 있게 합니다.
3. 비슷한 질문이 이미 있는 경우 기존 FAQ를 추천합니다.
4. AI가 공식 reference를 근거로 답변 초안을 제공합니다.

## Features

### FAQ Board

- 캠퍼스 생활 안내 관련 FAQ 게시글 조회
- FAQ 게시글 작성
- 댓글 기반 질의응답

### Search

- 키워드 기반 FAQ 검색
- 태그 또는 카테고리 기반 필터링

### Similar FAQ Recommendation

- 사용자가 새 질문을 작성할 때 비슷한 기존 FAQ 추천
- 중복 질문 방지

### AI Agent Answer

- 게시글이 올라오면 AI 에이전트가 관련 reference를 검색
- RAG를 이용해 근거 기반 답변 초안 생성
- 생성된 답변을 댓글 형태로 제공

### Reference Tracking

- 캠퍼스 생활 안내 원문 링크 관리
- RAG에 사용한 문서 스냅샷과 기준일 추적

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- FastAPI
- Python
- Pydantic
- SQLAlchemy

### Database

- PostgreSQL
- pgvector 예정

### AI

- LLM API
- RAG
- Embedding
- AI Agent
- MCP 연동 검토

### Infrastructure

- Docker
- Docker Compose

## Reference

- 캠퍼스 생활 안내: https://kraftonjungle.notion.site/junglecampuslife
- Reference 기록: `docs/references/campus-life-notion.md`
