import { type FormEvent, useState } from 'react';
import { login, register } from './api/auth';
import type { AuthResponse, User } from './types';

type AuthMode = 'login' | 'register';

type AuthPanelProps = {
	currentUser: User | null;
	onAuthSuccess: (auth: AuthResponse) => void;
	onLogout: () => void;
};

/** 회원가입/로그인 흐름을 담당하는 컴포넌트다.
 * 입력값은 AuthPanel 내부 state로 관리하고, 성공 결과는 부모(App)에 알린다.
 * App은 전달받은 사용자와 토큰을 저장해 전체 앱의 로그인 상태로 사용한다.
 */
function AuthPanel({ currentUser, onAuthSuccess, onLogout }: AuthPanelProps) {
	const [mode, setMode] = useState<AuthMode>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [authError, setAuthError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	/** 회원가입 또는 로그인을 실행한다.
	 * mode 값에 따라 다른 API를 호출하지만, 성공 응답 모양은 AuthResponse로 같다.
	 * 성공 후 부모에게 알려 App의 로그인 상태를 갱신하게 한다.
	 */
	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			setIsSubmitting(true);
			setAuthError(null);
			const auth = { email: email.trim(), password };
			const response =
				mode === 'login' ? await login(auth) : await register(auth);

			onAuthSuccess(response); // 토큰과 사용자 정보는 App이 보관한다.
			setPassword('');
		} catch (err) {
			setAuthError(
				err instanceof Error ? err.message : '인증 요청에 실패했습니다.'
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (currentUser) {
		return (
			<section className="auth-section" aria-label="로그인 상태">
				<div>
					<p className="auth-label">로그인 사용자</p>
					<p className="auth-email">{currentUser.email}</p>
				</div>
				<button type="button" onClick={onLogout}>
					로그아웃
				</button>
			</section>
		);
	}

	return (
		<section className="auth-section" aria-labelledby="auth-heading">
			<div>
				<p className="auth-label">Account</p>
				<h2 id="auth-heading">
					{mode === 'login' ? '로그인' : '회원가입'}
				</h2>
			</div>

			<form className="auth-form" onSubmit={handleSubmit}>
				<label>
					<span>이메일</span>
					<input
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="jungle@example.com"
					/>
				</label>

				<label>
					<span>비밀번호</span>
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="6자 이상"
					/>
				</label>

				<div className="auth-actions">
					<button type="submit" disabled={isSubmitting}>
						{isSubmitting
							? '처리 중...'
							: mode === 'login'
								? '로그인'
								: '가입하기'}
					</button>
					<button
						type="button"
						className="secondary-button"
						onClick={() =>
							setMode((currentMode) =>
								currentMode === 'login' ? 'register' : 'login'
							)
						}
					>
						{mode === 'login' ? '회원가입' : '로그인하기'}
					</button>
				</div>

				{authError && <p className="error">{authError}</p>}
			</form>
		</section>
	);
}

export default AuthPanel;
