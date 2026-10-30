import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'set-log-media';
const BATCH_SIZE = 100;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function hasValidSecret(request: Request, secret: string): boolean {
  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export async function POST(request: Request): Promise<Response> {
  const cleanupSecret = process.env.SET_LOG_CLEANUP_SECRET;

  if (!cleanupSecret) {
    return json({ error: '정리 API 설정이 없습니다.' }, 500);
  }

  if (!hasValidSecret(request, cleanupSecret)) {
    return json({ error: '인증에 실패했습니다.' }, 401);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return json({ error: 'Supabase 서버 설정이 없습니다.' }, 500);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: expiredLogs, error: logsError } = await supabase
      .from('set_logs')
      .select('id')
      .lte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (logsError) {
      return json({ error: '만료된 SetLog를 조회하지 못했습니다.' }, 500);
    }

    if (!expiredLogs?.length) {
      return json({ deletedLogs: 0, deletedMedia: 0 });
    }

    const logIds = expiredLogs.map((log) => log.id);

    const { data: mediaRows, error: mediaLookupError } = await supabase
      .from('set_log_media')
      .select('id, object_path')
      .in('set_log_id', logIds);

    if (mediaLookupError) {
      return json({ error: '만료된 미디어 정보를 조회하지 못했습니다.' }, 500);
    }

    const media = mediaRows ?? [];
    const objectPaths = media.map((row) => row.object_path);

    if (objectPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove(objectPaths);

      if (storageError) {
        return json({ error: 'Storage 파일을 삭제하지 못했습니다.' }, 500);
      }
    }

    const { error: mediaDeleteError } = await supabase
      .from('set_log_media')
      .delete()
      .in('set_log_id', logIds);

    if (mediaDeleteError) {
      return json({ error: '미디어 기록을 삭제하지 못했습니다.' }, 500);
    }

    const { error: logsDeleteError } = await supabase
      .from('set_logs')
      .delete()
      .in('id', logIds);

    if (logsDeleteError) {
      return json({ error: 'SetLog 기록을 삭제하지 못했습니다.' }, 500);
    }

    return json({
      deletedLogs: logIds.length,
      deletedMedia: media.length,
    });
  } catch {
    return json({ error: '정리 작업을 완료하지 못했습니다.' }, 500);
  }
}