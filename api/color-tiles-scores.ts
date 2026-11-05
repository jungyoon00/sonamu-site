import { createClient } from '@supabase/supabase-js';
import { isMemberSessionValid } from './_lib/member-session.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) throw new Error('Supabase 환경변수가 없습니다.');

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function requireMember(request: Request): Response | null {
  try {
    return isMemberSessionValid(request)
      ? null
      : json({ error: '부원 인증이 필요합니다.' }, 401);
  } catch {
    return json({ error: '서버 인증 설정을 확인할 수 없습니다.' }, 500);
  }
}

async function getTopFive() {
  const { data, error } = await getSupabaseAdmin()
    .from('color_tiles_scores')
    .select('player_name, score, updated_at')
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .order('player_key', { ascending: true })
    .limit(5);

  if (error) throw error;

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    playerName: row.player_name,
    score: row.score,
    updatedAt: row.updated_at,
  }));
}

export async function GET(request: Request): Promise<Response> {
  const authError = requireMember(request);
  if (authError) return authError;

  try {
    return json({ rankings: await getTopFive() });
  } catch {
    return json({ error: 'Color Tiles 랭킹을 불러오지 못했습니다.' }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청 출처를 확인할 수 없습니다.' }, 403);
  }

  const authError = requireMember(request);
  if (authError) return authError;

  if (Number(request.headers.get('content-length') ?? '0') > 2048) {
    return json({ error: '요청 크기가 너무 큽니다.' }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  }

  const input = body as Record<string, unknown>;
  const name = input.name;
  const score = input.score;

  if (
    typeof name !== 'string' ||
    [...name.trim()].length < 1 ||
    [...name.trim()].length > 20 ||
    typeof score !== 'number' ||
    !Number.isSafeInteger(score) ||
    score < 0
  ) {
    return json({ error: '이름이나 점수 형식이 올바르지 않습니다.' }, 400);
  }

  try {
    const { error } = await getSupabaseAdmin().rpc(
      'save_color_tiles_score',
      { p_name: name.trim(), p_score: score }
    );

    if (error) return json({ error: '점수를 저장하지 못했습니다.' }, 500);

    return json({ rankings: await getTopFive() });
  } catch {
    return json({ error: '점수를 저장하지 못했습니다.' }, 500);
  }
}