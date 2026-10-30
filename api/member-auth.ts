import { createClient } from '@supabase/supabase-js';
import {
  createHmac,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import {
  getSessionSecret,
  isMemberSessionValid,
  MEMBER_SESSION_COOKIE,
} from './_lib/member-session';


const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function json(
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit
): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(body), { status, headers });
}

function makeSessionToken(expiresAt: number, secret: string): string {
  const payload = Buffer.from(String(expiresAt)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function makeCookie(
  request: Request,
  value: string,
  maxAge: number
): string {
  const secure =
    new URL(request.url).protocol === 'https:' ? '; Secure' : '';

  return [
    `${MEMBER_SESSION_COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ') + secure;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return request.headers.get('sec-fetch-site') !== 'cross-site';
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function verifyMemberPassword(password: string): boolean {
  const encodedHash = process.env.MEMBER_PASSWORD_HASH;
  if (!encodedHash) {
    throw new Error('MEMBER_PASSWORD_HASH is missing');
  }

  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    throw new Error('MEMBER_PASSWORD_HASH has an invalid format');
  }

  const [, costText, blockSizeText, parallelizationText, saltText, keyText] =
    parts;

  const cost = Number(costText);
  const blockSize = Number(blockSizeText);
  const parallelization = Number(parallelizationText);
  const salt = Buffer.from(saltText, 'base64url');
  const expectedKey = Buffer.from(keyText, 'base64url');

  if (
    cost !== 16384 ||
    blockSize !== 8 ||
    parallelization !== 1 ||
    salt.length !== 16 ||
    expectedKey.length !== 64
  ) {
    throw new Error('MEMBER_PASSWORD_HASH parameters are invalid');
  }

  const actualKey = scryptSync(password, salt, expectedKey.length, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return timingSafeEqual(actualKey, expectedKey);
}

function getClientFingerprint(request: Request, secret: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  return createHmac('sha256', secret).update(ip).digest('hex');
}

export async function GET(request: Request): Promise<Response> {
  try {
    return json({ authenticated: isMemberSessionValid(request) });
  } catch {
    return json({ error: '서버 인증 설정을 확인할 수 없습니다.' }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 2048) {
    return json({ error: '요청 크기가 너무 큽니다.' }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  const action = (body as Record<string, unknown>).action;

  if (action === 'logout') {
    return json(
      { success: true },
      200,
      { 'Set-Cookie': makeCookie(request, '', 0) }
    );
  }

  if (action !== 'login') {
    return json({ error: '요청 작업이 올바르지 않습니다.' }, 400);
  }

  const password = (body as Record<string, unknown>).password;
  if (
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > 256
  ) {
    return json({ error: '비밀번호를 확인해주세요.' }, 400);
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    const sessionSecret = getSessionSecret();

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error('Supabase environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const fingerprint = getClientFingerprint(request, sessionSecret);
    const { data: attemptAllowed, error: rateLimitError } = await supabase.rpc(
      'consume_member_login_attempt',
      { p_fingerprint: fingerprint }
    );

    if (rateLimitError) {
      return json({ error: '로그인을 처리할 수 없습니다.' }, 503);
    }

    if (attemptAllowed !== true) {
      return json(
        { error: '로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.' },
        429,
        { 'Retry-After': '900' }
      );
    }

    if (!verifyMemberPassword(password)) {
      return json({ error: '비밀번호가 올바르지 않습니다.' }, 401);
    }

    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const token = makeSessionToken(expiresAt, sessionSecret);

    return json(
      { success: true, expiresAt },
      200,
      {
        'Set-Cookie': makeCookie(
          request,
          token,
          SESSION_DURATION_MS / 1000
        ),
      }
    );
  } catch {
    return json({ error: '서버 인증 설정을 확인할 수 없습니다.' }, 500);
  }
}