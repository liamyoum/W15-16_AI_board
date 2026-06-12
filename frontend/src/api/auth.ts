import type { AuthRequest, AuthResponse } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

async function requestAuth(path: string, auth: AuthRequest): Promise<AuthResponse> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(auth),
	});

	if (!response.ok) {
		const errorBody = await response.json().catch(() => null);
		throw new Error(errorBody?.detail ?? '인증 요청에 실패했습니다.');
	}

	return response.json();
}

/** FastAPI의 POST /auth/register를 호출한다.
 * 성공하면 백엔드가 만든 access_token과 사용자 정보를 반환한다.
 * 회원가입 직후 바로 로그인 상태로 전환하기 위해 AuthResponse를 그대로 사용한다.
 */
export function register(auth: AuthRequest): Promise<AuthResponse> {
	return requestAuth('/auth/register', auth);
}

/** FastAPI의 POST /auth/login을 호출한다.
 * 성공하면 이후 인증 API에 사용할 access_token과 사용자 정보를 반환한다.
 */
export function login(auth: AuthRequest): Promise<AuthResponse> {
	return requestAuth('/auth/login', auth);
}
