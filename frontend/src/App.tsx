/** 앱의 첫 화면을 담당하는 최상위 컴포넌트다.
 * 아직 API를 호출하지 않고, 프로젝트 목적만 화면에 보여준다.
 * 다음 단계에서 게시글 목록 state와 fetch 로직을 이곳에 붙인다.
 */
function App() {
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
		</main>
	);
}

export default App; // 다른 파일에서 App을 import할 수 있게 export
