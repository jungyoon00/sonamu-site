import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { isMemberSessionValid } from './_lib/member-session';

const BUCKET = 'set-log-media';
const MB = 1024 * 1024;

const MEDIA_RULES: Record<
  string,
  { extension: string; maxBytes: number }
> = {
  'image/jpeg': { extension: 'jpg', maxBytes: 5 * MB },
  'image/png': { extension: 'png', maxBytes: 5 * MB },
  'image/webp': { extension: 'webp', maxBytes: 5 * MB },
  'video/mp4': { extension: 'mp4', maxBytes: 20 * MB },
  'video/webm': { extension: 'webm', maxBytes: 20 * MB },
  'video/quicktime': { extension: 'mov', maxBytes: 20 * MB },
};

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

function isPendingPath(path: string): boolean {
  return /^pending\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(path);
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ error: '요청을 허용할 수 없습니다.' }, 403);
  }

  if (Number(request.headers.get('content-length') ?? '0') > 2048) {
    return json({ error: '요청 크기가 너무 큽니다.' }, 413);
  }

  try {
    if (!isMemberSessionValid(request)) {
      return json({ error: '부원 인증이 필요합니다.' }, 401);
    }
  } catch {
    return json({ error: '서버 인증 설정을 확인할 수 없습니다.' }, 500);
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
  const supabase = getSupabaseAdmin();
  const storage = supabase.storage.from(BUCKET);

  if (input.action === 'start') {
    const mimeType = input.mimeType;
    const sizeBytes = input.sizeBytes;

    if (
      typeof mimeType !== 'string' ||
      !MEDIA_RULES[mimeType] ||
      typeof sizeBytes !== 'number' ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > MEDIA_RULES[mimeType].maxBytes
    ) {
      return json(
        { error: '사진은 5MB, 영상은 20MB 이하만 올릴 수 있습니다.' },
        400
      );
    }

    const rule = MEDIA_RULES[mimeType];
    const path = `pending/${randomUUID()}.${rule.extension}`;

    const { data, error } = await storage.createSignedUploadUrl(path);

    if (error || !data) {
      return json({ error: '업로드를 준비하지 못했습니다.' }, 500);
    }

    return json({
      path,
      token: data.token,
      mimeType,
      maxBytes: rule.maxBytes,
    });
  }

  if (input.action === 'complete') {
    const path = input.path;
    const mimeType = input.mimeType;
    const message =
      typeof input.message === 'string' ? input.message.trim() : '';

    if (
      typeof path !== 'string' ||
      !isPendingPath(path) ||
      typeof mimeType !== 'string' ||
      !MEDIA_RULES[mimeType] ||
      !path.endsWith(`.${MEDIA_RULES[mimeType].extension}`) ||
      [...message].length > 500
    ) {
      return json({ error: '업로드 정보가 올바르지 않습니다.' }, 400);
    }

    const { data: fileInfo, error: infoError } = await storage.info(path);
    const rule = MEDIA_RULES[mimeType];
    
    if (infoError || !fileInfo) {
      await storage.remove([path]);
      return json({ error: '파일 정보를 확인할 수 없습니다.' }, 400);
    }
    
    const actualSize = fileInfo.size;
    
    if (
      typeof actualSize !== 'number' ||
      !Number.isSafeInteger(actualSize) ||
      actualSize <= 0 ||
      actualSize > rule.maxBytes ||
      fileInfo.contentType !== mimeType
    ) {
      await storage.remove([path]);
      return json(
        { error: '파일 크기나 형식을 확인할 수 없습니다.' },
        400
      );
    }

    const { data: entry, error: entryError } = await supabase
      .from('set_logs')
      .insert({ message })
      .select('id, message, created_at, expires_at')
      .single();

    if (entryError || !entry) {
      await storage.remove([path]);
      return json({ error: 'SetLog 등록에 실패했습니다.' }, 500);
    }

    const { error: mediaError } = await supabase
      .from('set_log_media')
      .insert({
        set_log_id: entry.id,
        object_path: path,
        mime_type: mimeType,
        size_bytes: actualSize,
      });

    if (mediaError) {
      await supabase.from('set_logs').delete().eq('id', entry.id);
      await storage.remove([path]);
      return json({ error: '미디어 등록에 실패했습니다.' }, 500);
    }

    return json(
      {
        entry: {
          id: entry.id,
          message: entry.message,
          createdAt: entry.created_at,
          expiresAt: entry.expires_at,
        },
      },
      201
    );
  }

  if (input.action === 'cancel') {
    const path = input.path;

    if (typeof path !== 'string' || !isPendingPath(path)) {
      return json({ error: '업로드 경로가 올바르지 않습니다.' }, 400);
    }

    const { data: linkedMedia, error: lookupError } = await supabase
      .from('set_log_media')
      .select('id')
      .eq('object_path', path)
      .maybeSingle();

    if (lookupError) {
      return json({ error: '업로드 상태를 확인하지 못했습니다.' }, 500);
    }

    if (linkedMedia) {
      return json({ error: '이미 등록된 미디어입니다.' }, 409);
    }

    const { error } = await storage.remove([path]);

    if (error) {
      return json({ error: '임시 파일을 정리하지 못했습니다.' }, 500);
    }

    return json({ success: true });
  }

  return json({ error: '요청 작업이 올바르지 않습니다.' }, 400);
}