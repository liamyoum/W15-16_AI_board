import type { Post } from './types';

type PostItemProps = {
	post: Post;
};

/** 게시글 하나를 화면에 보여주는 재사용 컴포넌트다.
 * 부모(App)가 넘겨준 post props를 받아 제목, 카테고리, 본문을 표시한다.
 */
function PostItem({ post }: PostItemProps) {
	return (
		<article className="post-item">
			<div className="post-meta">{post.category}</div>
			<h2>{post.title}</h2>
			<p>{post.content}</p>
		</article>
	);
}

export default PostItem;

