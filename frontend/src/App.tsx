import { type FormEvent, useEffect, useState } from 'react';
import { createPost, fetchPosts } from './api/posts';
import PostItem from './PostItem';
import type { Post } from './types';

/** 앱의 첫 화면을 담당하는 최상위 컴포넌트다.
 * 서버에서 받은 posts를 state로 관리하고, 로딩/에러/목록 화면을 결정한다.
 * 다음 단계에서는 이 정적 API를 DB 기반 API로 바꿔도 화면 계약은 유지한다.
 */
function App() {
	const [posts, setPosts] = useState<Post[]>([]); // 서버에서 받은 게시글 목록
	const [isLoading, setIsLoading] = useState(true); // 로딩중인지 여부
	const [loadError, setLoadError] = useState<string | null>(null); // 목록 조회 실패 메시지
	const [formError, setFormError] = useState<string | null>(null); // 작성 폼 실패 메시지
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [category, setCategory] = useState('campus-life');
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	/** 작성 폼 제출을 처리한다.
	 * 기본 새로고침을 막고, 입력값을 POST /posts로 보낸다.
	 * 성공하면 반환된 게시글을 목록 state에 추가한다.
	 */
	async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		const trimmedContent = content.trim();
		const trimmedCategory = category.trim();

		if (!trimmedTitle || !trimmedContent || !trimmedCategory) {
			setFormError('제목, 본문, 카테고리를 모두 입력하세요.');
			return;
		}

		try {
			setIsSubmitting(true);
			setFormError(null);
			const createdPost = await createPost({
				title: trimmedTitle,
				content: trimmedContent,
				category: trimmedCategory,
			});

			setPosts((currentPosts) => [...currentPosts, createdPost]);
			setTitle('');
			setContent('');
			setCategory('campus-life');
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : '게시글 작성에 실패했습니다.'
			);
		} finally {
			setIsSubmitting(false);
		}
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

			<section
				className="create-section"
				aria-labelledby="create-heading"
			>
				<h2 id="create-heading">FAQ 작성</h2>
				<form className="post-form" onSubmit={handleCreatePost}>
					<label>
						<span>제목</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="예: 캠퍼스 생활 안내는 어디서 확인하나요?"
						/>
					</label>

					<label>
						<span>본문</span>
						<textarea
							value={content}
							onChange={(event) => setContent(event.target.value)}
							placeholder="질문이나 안내 내용을 입력하세요."
							rows={4}
						/>
					</label>

					<label>
						<span>카테고리</span>
						<input
							value={category}
							onChange={(event) => setCategory(event.target.value)}
							placeholder="campus-life"
						/>
					</label>

					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? '저장 중...' : '게시글 저장'}
					</button>

					{formError && <p className="error">{formError}</p>}
				</form>
			</section>

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
