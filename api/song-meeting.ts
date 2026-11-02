import { createClient } from '@supabase/supabase-js';
import { isMemberSessionValid } from './_lib/member-session.js';

const SONG_FIELDS = new Set([
  'artist',
  'title',
  'video_url',
  'vocal',
  'drums',
  'guitar_1',
  'guitar_2',
  'bass',
  'keyboard_1',
  'keyboard_2',
  'free_opinion',
]);

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

  if (!url || !secretKey) {
    throw new Error('Supabase environment variables are missing');
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') ?? '0') > 8192) {
    return null;
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
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

export async function GET(request: Request): Promise<Response> {
  const authError = requireMember(request);
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();

    const [{ data: tabs, error: tabsError }, { data: songs, error: songsError }] =
      await Promise.all([
        supabase
          .from('song_meeting_tabs')
          .select('id, name, position, created_at')
          .order('position', { ascending: true }),
        supabase
          .from('song_meeting_songs')
          .select('*')
          .order('position', { ascending: true }),
      ]);

    if (tabsError || songsError) {
      return json({ error: '선곡회의를 불러오지 못했습니다.' }, 500);
    }

    return json({
      tabs: (tabs ?? []).map((tab) => ({
        ...tab,
        songs: (songs ?? []).filter((song) => song.tab_id === tab.id),
      })),
    });
  } catch {
    return json({ error: '선곡회의를 불러오지 못했습니다.' }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  const authError = requireMember(request);
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);

  try {
    const supabase = getSupabaseAdmin();

    if (body.action === 'create_tab') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';

      if (!name || [...name].length > 30) {
        return json({ error: '탭 이름은 1자 이상 30자 이하여야 합니다.' }, 400);
      }

      const { data: lastTab } = await supabase
        .from('song_meeting_tabs')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from('song_meeting_tabs')
        .insert({ name, position: (lastTab?.position ?? -1) + 1 })
        .select('id, name, position, created_at')
        .single();

      if (error || !data) {
        return json({ error: '탭을 추가하지 못했습니다.' }, 500);
      }

      return json({ tab: { ...data, songs: [] } }, 201);
    }

    if (body.action === 'create_song') {
      if (!isUuid(body.tabId)) {
        return json({ error: '탭 정보가 올바르지 않습니다.' }, 400);
      }

      const { data: lastSong } = await supabase
        .from('song_meeting_songs')
        .select('position')
        .eq('tab_id', body.tabId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from('song_meeting_songs')
        .insert({
          tab_id: body.tabId,
          position: (lastSong?.position ?? -1) + 1,
          title: '',
        })
        .select('*')
        .single();

      if (error || !data) {
        return json({ error: '곡을 추가하지 못했습니다.' }, 500);
      }

      return json({ song: data }, 201);
    }

    return json({ error: '요청 작업이 올바르지 않습니다.' }, 400);
  } catch {
    return json({ error: '선곡회의 항목을 추가하지 못했습니다.' }, 500);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  const authError = requireMember(request);
  if (authError) return authError;

  const body = await readBody(request);
  if (!body || !isUuid(body.songId)) {
    return json({ error: '수정할 곡 정보가 올바르지 않습니다.' }, 400);
  }

  let updates: Record<string, unknown>;

  if (body.action === 'update_field') {
    if (
      typeof body.field !== 'string' ||
      !SONG_FIELDS.has(body.field) ||
      typeof body.value !== 'string'
    ) {
      return json({ error: '수정할 항목이 올바르지 않습니다.' }, 400);
    }

    const maxLength = body.field === 'free_opinion' ? 1000 : 300;
    if ([...body.value].length > maxLength) {
      return json({ error: '입력한 내용이 너무 깁니다.' }, 400);
    }

    updates = { [body.field]: body.value };
  } else if (body.action === 'set_review') {
    if (typeof body.value !== 'boolean') {
      return json({ error: '검토 후보 설정이 올바르지 않습니다.' }, 400);
    }

    updates = { promoted_to_review: body.value };
  } else if (body.action === 'set_confirmed') {
    if (
      typeof body.value !== 'boolean' ||
      (body.confirmedPosition !== undefined &&
        body.confirmedPosition !== null &&
        (!Number.isInteger(body.confirmedPosition) ||
          (body.confirmedPosition as number) < 0))
    ) {
      return json({ error: '최종 확정 정보가 올바르지 않습니다.' }, 400);
    }

    updates = {
      is_confirmed: body.value,
      confirmed_position: body.value ? body.confirmedPosition ?? null : null,
    };
  } else {
    return json({ error: '수정 작업이 올바르지 않습니다.' }, 400);
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('song_meeting_songs')
      .update(updates)
      .eq('id', body.songId)
      .select('*')
      .single();

    if (error || !data) {
      return json({ error: '곡 정보를 수정하지 못했습니다.' }, 500);
    }

    return json({ song: data });
  } catch {
    return json({ error: '곡 정보를 수정하지 못했습니다.' }, 500);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  const authError = requireMember(request);
  if (authError) return authError;

  const body = await readBody(request);
  if (!body || !isUuid(body.songId)) {
    return json({ error: '삭제할 곡 정보가 올바르지 않습니다.' }, 400);
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from('song_meeting_songs')
      .delete()
      .eq('id', body.songId);

    if (error) {
      return json({ error: '곡을 삭제하지 못했습니다.' }, 500);
    }

    return json({ success: true });
  } catch {
    return json({ error: '곡을 삭제하지 못했습니다.' }, 500);
  }
}