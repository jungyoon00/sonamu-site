import { supabase } from '../lib/supabaseClient';

export type SetLogMedia = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export type SetLogEntry = {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  media: SetLogMedia[];
};

type ApiError = {
  error?: string;
};

async function requestJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const result = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(result.error || '요청을 처리하지 못했습니다.');
  }

  return result;
}

export async function fetchSetLogs(): Promise<SetLogEntry[]> {
  const result = await requestJson<{ entries: SetLogEntry[] }>(
    '/api/set-logs'
  );

  return result.entries;
}

export async function createSetLogMessage(
  message: string
): Promise<SetLogEntry> {
  const result = await requestJson<{ entry: SetLogEntry }>(
    '/api/set-logs',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  );

  return result.entry;
}

export async function createSetLogMedia(
  file: File,
  message: string
): Promise<void> {
  let uploadPath: string | null = null;

  try {
    const upload = await requestJson<{
      path: string;
      token: string;
      mimeType: string;
    }>('/api/set-log-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });

    uploadPath = upload.path;

    const { error: uploadError } = await supabase.storage
      .from('set-log-media')
      .uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error('파일 업로드에 실패했습니다. 다시 시도해주세요.');
    }

    await requestJson<{ entry: unknown }>('/api/set-log-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        path: upload.path,
        mimeType: file.type,
        message,
      }),
    });
  } catch (error) {
    if (uploadPath) {
      await requestJson('/api/set-log-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          path: uploadPath,
        }),
      }).catch(() => undefined);
    }

    throw error instanceof Error
      ? error
      : new Error('미디어를 등록하지 못했습니다.');
  }
}