import type {
	CommentCreateRequest,
	Post,
	PostComment,
	PostCreateRequest,
	PostListResponse,
	PostUpdateRequest,
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

function authHeaders(token: string) {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	};
}

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
export async function createPost(
	token: string,
	newPost: PostCreateRequest
): Promise<Post> {
	const response = await fetch(`${API_BASE_URL}/posts`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(newPost),
	});

	if (!response.ok) {
		throw new Error('게시글 작성에 실패했습니다.');
	}

	return response.json();
}

/** FastAPI의 PATCH /posts/{id}를 호출해 게시글을 수정한다.
 * Authorization 헤더에 토큰을 실어 보내 백엔드가 작성자를 확인하게 한다.
 * 성공하면 수정된 게시글을 반환한다.
 */
export async function updatePost(
	token: string,
	postId: number,
	updatedPost: PostUpdateRequest
): Promise<Post> {
	const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
		method: 'PATCH',
		headers: authHeaders(token),
		body: JSON.stringify(updatedPost),
	});

	if (!response.ok) {
		throw new Error('게시글 수정에 실패했습니다.');
	}

	return response.json();
}

/** FastAPI의 DELETE /posts/{id}를 호출해 게시글을 삭제한다.
 * 삭제 성공 시 body가 없으므로 response.json()을 호출하지 않는다.
 */
export async function deletePost(token: string, postId: number): Promise<void> {
	const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
		method: 'DELETE',
		headers: authHeaders(token),
	});

	if (!response.ok) {
		throw new Error('게시글 삭제에 실패했습니다.');
	}
}

/** FastAPI의 POST /posts/{id}/comments를 호출해 댓글을 작성한다.
 * 댓글도 로그인 사용자가 작성하므로 Authorization 헤더에 토큰을 함께 보낸다.
 * 성공하면 생성된 댓글 하나를 반환한다.
 */
export async function createComment(
	token: string,
	postId: number,
	newComment: CommentCreateRequest
): Promise<PostComment> {
	const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(newComment),
	});

	if (!response.ok) {
		throw new Error('댓글 작성에 실패했습니다.');
	}

	return response.json();
}
