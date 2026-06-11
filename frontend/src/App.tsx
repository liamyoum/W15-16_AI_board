import { useEffect, useState } from 'react';

type Post = {
	id: number;
	title: string;
	content: string;
	category: string;
};

type PostListResponse = {
	posts: Post[];
};

const API_BASE_URL = 'http://127.0.0.1:8000';

/** FastAPI의 GET /posts를 호출해 FAQ 게시글 배열을 가져온다.
 * fetch는 HTTP 응답 전체를 받고, response.json()이 body를 JS 객체로 바꾼다.
 * 실패 상태 코드는 화면에 에러를 보여주기 위해 Error로 바꿔 던진다.
 */
async function fetchPosts() {
	const response = await fetch(`${API_BASE_URL}/posts`);

	if (!response.ok) {
		throw new Error('게시글 목록을 불러오지 못했습니다.');
	}

	const data: PostListResponse = await response.json();
	return data.posts;
}

/** 게시글 하나를 화면에 보여주는 재사용 컴포넌트다.
 * 부모(App)가 넘겨준 post props를 받아 제목, 카테고리, 본문을 표시한다.
 */
function PostItem({ post }: { post: Post }) {
	return (
		<article className="post-item">
			<div className="post-meta">{post.category}</div>
			<h2>{post.title}</h2>
			<p>{post.content}</p>
		</article>
	);
}

/** 앱의 첫 화면을 담당하는 최상위 컴포넌트다.
 * 서버에서 받은 posts를 state로 관리하고, 로딩/에러/목록 화면을 결정한다.
 * 다음 단계에서는 이 정적 API를 DB 기반 API로 바꿔도 화면 계약은 유지한다.
 */
function App() {
	const [posts, setPosts] = useState<Post[]>([]); // 서버에서 받은 게시글 목록
	const [isLoading, setIsLoading] = useState(true); // 로딩중인지 여부
	const [error, setError] = useState<string | null>(null); // 실패했을 때 메시지

	// 화면이 처음 렌더링 된 후 fetchPosts()를 실행하는 곳
	useEffect(() => {
		async function loadPosts() {
			// 성공하면 setPosts
			try {
				setIsLoading(true);
				setError(null);
				const postsFromServer = await fetchPosts();
				setPosts(postsFromServer); // 서버 응답을 state에 넣어 화면이 다시 렌더링되게 한다.
				// 실패하면 setError
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: '알 수 없는 오류가 발생했습니다.'
				);
				// 끝나면 setIsLoading(false)
			} finally {
				setIsLoading(false);
			}
		}

		loadPosts();
	}, []);

	return (
		<main className="page">
			<section className="hero">
				<p className="eyebrow">Krafton Jungle Campus Life</p>
				<h1>AI FAQ Board</h1>
				<p className="description">
					캠퍼스 생활 안내 문서를 기반으로 FAQ 검색과 AI 답변을
					제공하는 게시판입니다.
				</p>
			</section>

			<section
				className="posts-section"
				aria-labelledby="posts-heading"
			>
				<h2 id="posts-heading">FAQ 게시글</h2>

				{isLoading && (
					<p className="status">게시글을 불러오는 중입니다.</p>
				)}

				{error && <p className="error">{error}</p>}

				{!isLoading && !error && posts.length === 0 && (
					<p className="status">아직 게시글이 없습니다.</p>
				)}

				{!isLoading && !error && posts.length > 0 && (
					<div className="post-list">
						{posts.map((post) => (
							<PostItem key={post.id} post={post} />
						))}
					</div>
				)}
			</section>
		</main>
	);
}

export default App; // 다른 파일에서 App을 import할 수 있게 export
