import { type FormEvent, useState } from 'react';
import { createPost } from './api/posts';
import type { Post } from './types';

// PostForm이 부모(App)에게 받아야 하는 props의 타입이다.
// 실제 함수 내용은 App이 만들고, PostForm은 저장 성공 후 호출만 한다.
type PostFormProps = {
	onPostCreated: (post: Post) => void; // Post를 받아 실행하고 반환값은 없는 함수
};

/** 새 FAQ 게시글 작성만 담당하는 컴포넌트다.
 * 입력값 state를 직접 관리하고, POST /posts 요청을 보낸다.
 * 생성 성공 시 부모(App)에게 새 게시글을 넘겨 목록 갱신을 요청한다.
 */
function PostForm({ onPostCreated }: PostFormProps) {
	const [formError, setFormError] = useState<string | null>(null);
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [category, setCategory] = useState('campus-life');
	const [isSubmitting, setIsSubmitting] = useState(false);

	/** 작성 폼 제출을 처리한다.
	 * 기본 새로고침을 막고, 입력값을 POST /posts로 보낸다.
	 * 성공하면 부모가 넘겨준 onPostCreated 함수를 호출한다.
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

			// PostForm이 posts state를 직접 바꾸지 않고, 부모에게 생성 결과를 알린다.
			onPostCreated(createdPost);
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
		<section className="create-section" aria-labelledby="create-heading">
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
	);
}

export default PostForm;
