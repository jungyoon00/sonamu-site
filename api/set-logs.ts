import { createClient } from '@supabase/supabase-js';
import { isMemberSessionValid } from './_lib/member-session';

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

export async function GET(request: Request): Promise<Response> {
  try {
    if (!isMemberSessionValid(request)) {
      return json({ error: '부원 인증이 필요합니다.' }, 401);
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('set_logs')
      .select(
        'id, message, created_at, expires_at, set_log_media(id, object_path, mime_type, size_bytes)'
      )
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return json({ error: 'SetLog를 불러오지 못했습니다.' }, 500);
    }

    const entries = await Promise.all(
      (data ?? []).map(async (entry) => {
        const mediaItems = await Promise.all(
          (entry.set_log_media ?? []).map(async (media) => {
            const secondsUntilExpiry = Math.floor(
              (new Date(entry.expires_at).getTime() - Date.now()) / 1000
            );

            if (secondsUntilExpiry <= 0) return null;

            const { data: signed, error: signedUrlError } = await supabase
              .storage
              .from('set-log-media')
              .createSignedUrl(
                media.object_path,
                Math.min(900, secondsUntilExpiry)
              );

            if (signedUrlError || !signed) {
              throw new Error('Could not create a media URL');
            }

            return {
              id: media.id,
              mimeType: media.mime_type,
              sizeBytes: media.size_bytes,
              url: signed.signedUrl,
            };
          })
        );

        const media = mediaItems.filter(
          (item): item is NonNullable<typeof item> => item !== null
        );

        return {
          id: entry.id,
          message: entry.message,
          createdAt: entry.created_at,
          expiresAt: entry.expires_at,
          media,
        };
      })
    );

    return json({
      entries: entries.filter(
        (entry) => entry.message.trim().length > 0 || entry.media.length > 0
      ),
    });
  } catch {
    return json({ error: 'SetLog를 불러오지 못했습니다.' }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  if (!isMemberSessionValid(request)) {
    return json({ error: '부원 인증이 필요합니다.' }, 401);
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

  const message = (body as Record<string, unknown>).message;

  if (
    typeof message !== 'string' ||
    message.trim().length === 0 ||
    [...message.trim()].length > 500
  ) {
    return json({ error: '메시지는 1자 이상 500자 이하여야 합니다.' }, 400);
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('set_logs')
      .insert({ message: message.trim() })
      .select('id, message, created_at, expires_at')
      .single();

    if (error || !data) {
      return json({ error: '메시지를 등록하지 못했습니다.' }, 500);
    }

    return json(
      {
        entry: {
          id: data.id,
          message: data.message,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
          media: [],
        },
      },
      201
    );
  } catch {
    return json({ error: '메시지를 등록하지 못했습니다.' }, 500);
  }
}