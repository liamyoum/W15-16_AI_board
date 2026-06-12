import { useEffect, useState } from 'react';
import { fetchPosts } from './api/posts';
import PostItem from './PostItem';
import PostForm from './PostForm';
import type { Post } from './types';

/** 앱의 첫 화면을 담당하는 최상위 컴포넌트다.
 * 서버에서 받은 posts를 state로 관리하고, 로딩/에러/목록 화면을 결정한다.
 * 다음 단계에서는 이 정적 API를 DB 기반 API로 바꿔도 화면 계약은 유지한다.
 */
function App() {
	const [posts, setPosts] = useState<Post[]>([]); // 서버에서 받은 게시글 목록
	const [isLoading, setIsLoading] = useState(true); // 로딩중인지 여부
	const [loadError, setLoadError] = useState<string | null>(null); // 목록 조회 실패 메시지

	// 화면이 처음 렌더링 된 후 fetchPosts()를 실행하는 곳
	useEffect(() => {
		async function loadPosts() {
			try {
				setIsLoading(true);
				setLoadError(null);
				const postsFromServer = await fetchPosts();
				setPosts(postsFromServer); // 서버 응답을 state에 넣어 화면이 다시 렌더링되게 한다.
			} catch (err) {
				setLoadError(
					err instanceof Error
						? err.message
						: '알 수 없는 오류가 발생했습니다.'
				);
			} finally {
				setIsLoading(false);
			}
		}

		loadPosts();
	}, []);

	/** PostForm이 새 게시글 생성을 끝냈을 때 실행된다.
	 * posts state는 App이 가지고 있으므로, 목록 갱신도 App에서 처리한다.
	 * 이 함수는 PostForm에 props로 전달되고, 저장 성공 시 PostForm이 호출한다.
	 */
	function handlePostCreated(createdPost: Post) {
		setPosts((currentPosts) => [...currentPosts, createdPost]);
	}

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

			{/* App이 만든 함수를 PostForm의 onPostCreated props로 넘긴다.
			    PostForm은 저장 성공 후 이 함수를 호출해 App의 posts 갱신을 요청한다. */}
			<PostForm onPostCreated={handlePostCreated} />

			<section
				className="posts-section"
				aria-labelledby="posts-heading"
			>
				<h2 id="posts-heading">FAQ 게시글</h2>

				{isLoading && (
					<p className="status">게시글을 불러오는 중입니다.</p>
				)}

				{loadError && <p className="error">{loadError}</p>}

				{!isLoading && !loadError && posts.length === 0 && (
					<p className="status">아직 게시글이 없습니다.</p>
				)}

				{!isLoading && !loadError && posts.length > 0 && (
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
