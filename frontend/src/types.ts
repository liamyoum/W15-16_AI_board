// 백엔드 GET /posts 응답과 프론트 화면이 공유하는 게시글 데이터 모양이다.
export type Post = {
	id: number;
	title: string;
	content: string;
	category: string;
	author_email: string | null;
	comments: PostComment[];
};

// 백엔드 댓글 응답과 프론트 댓글 목록이 공유하는 데이터 모양이다.
export type PostComment = {
	id: number;
	post_id: number;
	content: string;
	author_email: string | null;
};

// 백엔드 POST /posts 요청 body와 같은 게시글 작성 데이터 모양이다.
export type PostCreateRequest = {
	title: string;
	content: string;
	category: string;
};

// 백엔드 PATCH /posts/{id} 요청 body와 같은 게시글 수정 데이터 모양이다.
export type PostUpdateRequest = {
	title?: string;
	content?: string;
	category?: string;
};

// 백엔드 POST /posts/{id}/comments 요청 body와 같은 댓글 작성 데이터 모양이다.
export type CommentCreateRequest = {
	content: string;
};

export type PostListResponse = {
	posts: Post[];
};

// 로그인 후 화면과 API 요청에서 사용할 사용자 정보다.
export type User = {
	id: number;
	email: string;
};

// 회원가입/로그인 요청 body와 같은 데이터 모양이다.
export type AuthRequest = {
	email: string;
	password: string;
};

// 백엔드가 회원가입/로그인 성공 시 반환하는 응답 모양이다.
export type AuthResponse = {
	access_token: string;
	token_type: 'bearer';
	user: User;
};
