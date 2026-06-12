import { useEffect, useState } from 'react';
import { fetchPosts } from './api/posts';
import AuthPanel from './AuthPanel';
import PostItem from './PostItem';
import PostForm from './PostForm';
import type { AuthResponse, Post, PostComment, User } from './types';

/** 앱의 첫 화면을 담당하는 최상위 컴포넌트다.
 * 서버에서 받은 posts를 state로 관리하고, 로딩/에러/목록 화면을 결정한다.
 * 다음 단계에서는 이 정적 API를 DB 기반 API로 바꿔도 화면 계약은 유지한다.
 */
function App() {
	const [posts, setPosts] = useState<Post[]>([]); // 서버에서 받은 게시글 목록
	const [isLoading, setIsLoading] = useState(false); // 로딩중인지 여부
	const [loadError, setLoadError] = useState<string | null>(null); // 목록 조회 실패 메시지
	const [currentUser, setCurrentUser] = useState<User | null>(() => {
		const savedUser = localStorage.getItem('jungle-faq-user');
		const savedToken = localStorage.getItem('jungle-faq-token');
		return savedUser && savedToken ? (JSON.parse(savedUser) as User) : null;
	});
	const [accessToken, setAccessToken] = useState(
		() => localStorage.getItem('jungle-faq-token') ?? ''
	);

	// 로그인된 사용자가 있을 때만 게시글을 불러온다.
	useEffect(() => {
		if (!currentUser) {
			setPosts([]);
			setIsLoading(false);
			setLoadError(null);
			return;
		}

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
	}, [currentUser]);

	/** PostForm이 새 게시글 생성을 끝냈을 때 실행된다.
	 * posts state는 App이 가지고 있으므로, 목록 갱신도 App에서 처리한다.
	 * 이 함수는 PostForm에 props로 전달되고, 저장 성공 시 PostForm이 호출한다.
	 */
	function handlePostCreated(createdPost: Post) {
		setPosts((currentPosts) => [...currentPosts, createdPost]);
	}

	/** PostItem에서 게시글 수정이 성공했을 때 실행된다.
	 * 같은 id의 게시글만 새 응답으로 바꿔 목록 화면을 최신 상태로 만든다.
	 */
	function handlePostUpdated(updatedPost: Post) {
		setPosts((currentPosts) =>
			currentPosts.map((post) =>
				post.id === updatedPost.id ? updatedPost : post
			)
		);
	}

	/** PostItem에서 게시글 삭제가 성공했을 때 실행된다.
	 * 삭제된 id를 목록 state에서 제거해 화면에서도 사라지게 한다.
	 */
	function handlePostDeleted(postId: number) {
		setPosts((currentPosts) =>
			currentPosts.filter((post) => post.id !== postId)
		);
	}

	/** PostItem에서 댓글 작성이 성공했을 때 실행된다.
	 * 해당 게시글의 comments 배열에 새 댓글만 추가해 화면을 갱신한다.
	 */
	function handleCommentCreated(postId: number, comment: PostComment) {
		setPosts((currentPosts) =>
			currentPosts.map((post) =>
				post.id === postId
					? { ...post, comments: [...post.comments, comment] }
					: post
			)
		);
	}

	/** AuthPanel에서 회원가입/로그인이 성공했을 때 실행된다.
	 * 토큰은 다음 인증 API 요청에 쓰기 위해 localStorage에도 저장한다.
	 */
	function handleAuthSuccess(auth: AuthResponse) {
		setCurrentUser(auth.user);
		setAccessToken(auth.access_token);
		localStorage.setItem('jungle-faq-user', JSON.stringify(auth.user));
		// 토큰은 화면에 표시하지 않고, 다음 인증 API 요청을 위해 브라우저에 저장한다.
		localStorage.setItem('jungle-faq-token', auth.access_token);
	}

	/** 현재 브라우저에 저장된 로그인 정보를 지운다.
	 * 서버 세션을 쓰지 않는 v1 구조라서 클라이언트의 토큰 제거가 로그아웃이다.
	 */
	function handleLogout() {
		setCurrentUser(null);
		setAccessToken('');
		localStorage.removeItem('jungle-faq-user');
		localStorage.removeItem('jungle-faq-token');
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

			<AuthPanel
				currentUser={currentUser}
				onAuthSuccess={handleAuthSuccess}
				onLogout={handleLogout}
			/>

			{currentUser && (
				<>
					{/* App이 만든 함수를 PostForm의 onPostCreated props로 넘긴다.
					    PostForm은 저장 성공 후 이 함수를 호출해 App의 posts 갱신을 요청한다. */}
					<PostForm
						accessToken={accessToken}
						onPostCreated={handlePostCreated}
					/>

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
									<PostItem
										key={post.id}
										post={post}
										currentUser={currentUser}
										accessToken={accessToken}
										onPostUpdated={handlePostUpdated}
										onPostDeleted={handlePostDeleted}
										onCommentCreated={handleCommentCreated}
									/>
								))}
							</div>
						)}
					</section>
				</>
			)}
		</main>
	);
}

export default App; // 다른 파일에서 App을 import할 수 있게 export
