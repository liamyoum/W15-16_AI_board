// 백엔드 GET /posts 응답과 프론트 화면이 공유하는 게시글 데이터 모양이다.
export type Post = {
	id: number;
	title: string;
	content: string;
	category: string;
};

// 백엔드 POST /posts 요청 body와 같은 게시글 작성 데이터 모양이다.
export type PostCreateRequest = {
	title: string;
	content: string;
	category: string;
};

export type PostListResponse = {
	posts: Post[];
};
