type AuthResponse = {
  authenticated?: boolean;
  success?: boolean;
  error?: string;
};

async function sendRequest(
  method: 'GET' | 'POST',
  body?: { action: 'login'; password: string } | { action: 'logout' }
): Promise<AuthResponse> {
  const response = await fetch('/api/member-auth', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = (await response.json().catch(() => ({}))) as AuthResponse;

  if (!response.ok) {
    throw new Error(result.error || '인증 요청에 실패했습니다.');
  }

  return result;
}

export async function checkMemberSession(): Promise<boolean> {
  const result = await sendRequest('GET');
  return result.authenticated === true;
}

export async function loginMember(password: string): Promise<void> {
  await sendRequest('POST', { action: 'login', password });
}

export async function logoutMember(): Promise<void> {
  await sendRequest('POST', { action: 'logout' });
}