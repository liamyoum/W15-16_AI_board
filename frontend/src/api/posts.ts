import type { Post, PostCreateRequest, PostListResponse } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

/** FastAPI의 GET /posts를 호출해 FAQ 게시글 배열을 가져온다.
 * fetch는 HTTP 응답 전체를 받고, response.json()이 body를 JS 객체로 바꾼다.
 * 실패 상태 코드는 화면에 에러를 보여주기 위해 Error로 바꿔 던진다.
 */
export async function fetchPosts(): Promise<Post[]> {
	const response = await fetch(`${API_BASE_URL}/posts`);

	if (!response.ok) {
		throw new Error('게시글 목록을 불러오지 못했습니다.');
	}

	const data: PostListResponse = await response.json();
	return data.posts;
}

/** FastAPI의 POST /posts를 호출해 새 FAQ 게시글을 저장한다.
 * 요청 body는 JSON 문자열로 보내고, 성공하면 생성된 게시글을 반환한다.
 * 실패 상태 코드는 폼에 에러를 보여주기 위해 Error로 바꿔 던진다.
 */
export async function createPost(newPost: PostCreateRequest): Promise<Post> {
	const response = await fetch(`${API_BASE_URL}/posts`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(newPost),
	});

	if (!response.ok) {
		throw new Error('게시글 작성에 실패했습니다.');
	}

	return response.json();
}
