import { type FormEvent, useState } from 'react';
import { createComment, deletePost, updatePost } from './api/posts';
import type { Post, PostComment, User } from './types';

type PostItemProps = {
	post: Post;
	currentUser: User;
	accessToken: string;
	onPostUpdated: (post: Post) => void;
	onPostDeleted: (postId: number) => void;
	onCommentCreated: (postId: number, comment: PostComment) => void;
};

/** 게시글 하나를 화면에 보여주는 재사용 컴포넌트다.
 * 제목/본문 표시뿐 아니라 한 게시글의 수정/삭제 요청도 처리한다.
 * 수정/삭제 성공 결과는 부모(App)에 알려 posts state를 갱신하게 한다.
 */
function PostItem({
	post,
	currentUser,
	accessToken,
	onPostUpdated,
	onPostDeleted,
	onCommentCreated,
}: PostItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [title, setTitle] = useState(post.title);
	const [content, setContent] = useState(post.content);
	const [category, setCategory] = useState(post.category);
	const [commentContent, setCommentContent] = useState('');
	const [itemError, setItemError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

	// 작성자 이메일이 현재 로그인 사용자와 같을 때만 수정/삭제 버튼을 보여준다.
	const canManagePost = post.author_email === currentUser.email;

	function startEditing() {
		setTitle(post.title);
		setContent(post.content);
		setCategory(post.category);
		setItemError(null);
		setIsEditing(true);
	}

	/** 수정 폼 제출을 처리한다.
	 * PATCH /posts/{id}에 변경된 값을 보내고, 성공하면 부모 목록 state를 갱신한다.
	 */
	async function handleUpdatePost(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		const trimmedContent = content.trim();
		const trimmedCategory = category.trim();

		if (!trimmedTitle || !trimmedContent || !trimmedCategory) {
			setItemError('제목, 본문, 카테고리를 모두 입력하세요.');
			return;
		}

		try {
			setIsSaving(true);
			setItemError(null);
			const updatedPost = await updatePost(accessToken, post.id, {
				title: trimmedTitle,
				content: trimmedContent,
				category: trimmedCategory,
			});
			onPostUpdated(updatedPost);
			setIsEditing(false);
		} catch (err) {
			setItemError(
				err instanceof Error ? err.message : '게시글 수정에 실패했습니다.'
			);
		} finally {
			setIsSaving(false);
		}
	}

	/** 삭제 버튼 클릭을 처리한다.
	 * DELETE /posts/{id} 성공 후 부모에게 삭제된 id를 알려 목록에서 제거한다.
	 */
	async function handleDeletePost() {
		const shouldDelete = window.confirm('이 게시글을 삭제할까요?');
		if (!shouldDelete) {
			return;
		}

		try {
			setIsSaving(true);
			setItemError(null);
			await deletePost(accessToken, post.id);
			onPostDeleted(post.id);
		} catch (err) {
			setItemError(
				err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.'
			);
		} finally {
			setIsSaving(false);
		}
	}

	/** 댓글 작성 폼 제출을 처리한다.
	 * POST /posts/{id}/comments에 댓글 내용을 보내고, 성공하면 부모 목록 state를 갱신한다.
	 */
	async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedContent = commentContent.trim();
		if (!trimmedContent) {
			setItemError('댓글 내용을 입력하세요.');
			return;
		}

		try {
			setIsCommentSubmitting(true);
			setItemError(null);
			const createdComment = await createComment(accessToken, post.id, {
				content: trimmedContent,
			});
			onCommentCreated(post.id, createdComment);
			setCommentContent('');
		} catch (err) {
			setItemError(
				err instanceof Error ? err.message : '댓글 작성에 실패했습니다.'
			);
		} finally {
			setIsCommentSubmitting(false);
		}
	}

	if (isEditing) {
		return (
			<article className="post-item">
				<form className="post-edit-form" onSubmit={handleUpdatePost}>
					<label>
						<span>제목</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</label>

					<label>
						<span>본문</span>
						<textarea
							value={content}
							onChange={(event) => setContent(event.target.value)}
							rows={4}
						/>
					</label>

					<label>
						<span>카테고리</span>
						<input
							value={category}
							onChange={(event) => setCategory(event.target.value)}
						/>
					</label>

					<div className="post-actions">
						<button type="submit" disabled={isSaving}>
							{isSaving ? '저장 중...' : '수정 저장'}
						</button>
						<button
							type="button"
							className="secondary-button"
							onClick={() => setIsEditing(false)}
						>
							취소
						</button>
					</div>

					{itemError && <p className="error">{itemError}</p>}
				</form>
			</article>
		);
	}

	return (
		<article className="post-item">
			<div className="post-meta">
				<span>{post.category}</span>
				<span>{post.author_email ?? '작성자 없음'}</span>
			</div>
			<h2>{post.title}</h2>
			<p>{post.content}</p>

			{canManagePost && (
				<div className="post-actions">
					<button
						type="button"
						className="secondary-button"
						onClick={startEditing}
					>
						수정
					</button>
					<button
						type="button"
						className="danger-button"
						onClick={handleDeletePost}
						disabled={isSaving}
					>
						삭제
					</button>
				</div>
			)}

			<section className="comments-section" aria-label="댓글">
				<h3>댓글</h3>
				{post.comments.length === 0 && (
					<p className="comment-empty">아직 댓글이 없습니다.</p>
				)}

				{post.comments.length > 0 && (
					<div className="comment-list">
						{post.comments.map((comment) => (
							<div className="comment-item" key={comment.id}>
								<div className="comment-author">
									{comment.author_email ?? '알 수 없음'}
								</div>
								<p>{comment.content}</p>
							</div>
						))}
					</div>
				)}

				<form className="comment-form" onSubmit={handleCreateComment}>
					<input
						value={commentContent}
						onChange={(event) => setCommentContent(event.target.value)}
						placeholder="댓글을 입력하세요."
					/>
					<button type="submit" disabled={isCommentSubmitting}>
						{isCommentSubmitting ? '작성 중...' : '댓글 작성'}
					</button>
				</form>
			</section>

			{itemError && <p className="error">{itemError}</p>}
		</article>
	);
}

export default PostItem;
