import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSetLogMedia,
  createSetLogMessage,
  fetchSetLogs,
} from '../api/setLogs';
import type { SetLogEntry } from '../api/setLogs';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'JPG, PNG, WebP 사진이나 MP4, WebM, MOV 영상만 올릴 수 있습니다.';
  }

  const maxBytes = file.type.startsWith('image/')
    ? 5 * 1024 * 1024
    : 20 * 1024 * 1024;

  if (file.size > maxBytes) {
    return file.type.startsWith('image/')
      ? '사진은 5MB 이하로 올려주세요.'
      : '영상은 20MB 이하로 올려주세요.';
  }

  return null;
}

function formatRemaining(expiresAt: string, now: number): string {
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs <= 0) return '만료됨';

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `남은 시간 ${hours}시간 ${minutes}분`;
}

function SetLogs() {
  const [entries, setEntries] = useState<SetLogEntry[]>([]);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshEntries = useCallback(async () => {
    try {
      const latestEntries = await fetchSetLogs();
      setEntries(latestEntries);
      setError('');
    } catch {
      setError('SetLog를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const latestEntries = await fetchSetLogs();
        if (active) {
          setEntries(latestEntries);
          setError('');
        }
      } catch {
        if (active) {
          setError('SetLog를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void refresh();

    // 서명된 미디어 URL을 갱신하고 만료된 항목을 목록에서 제거합니다.
    const refreshTimer = window.setInterval(() => {
      void refresh();
    }, 10 * 60 * 1000);

    const clockTimer = window.setInterval(() => {
      setNow(Date.now());
    }, 30 * 1000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedMessage = message.trim();

    if (!trimmedMessage && !selectedFile) {
      setError('메시지나 사진·영상 중 하나를 입력해주세요.');
      return;
    }

    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      if (selectedFile) {
        await createSetLogMedia(selectedFile, trimmedMessage);
      } else {
        await createSetLogMessage(trimmedMessage);
      }

      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await refreshEntries();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'SetLog 등록에 실패했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const visibleEntries = entries.filter(
    (entry) => new Date(entry.expiresAt).getTime() > now
  );

  return (
    <section className="set-logs-page">
      <header className="set-logs-heading">
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>SetLog</h2>
        <p>사진·영상과 짧은 메시지를 부원들과 공유합니다. 게시물은 24시간 후 만료됩니다.</p>
      </header>

      <form className="set-logs-form" onSubmit={handleSubmit}>
        <label htmlFor="set-log-message">메시지</label>
        <textarea
          id="set-log-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="부원들과 나눌 짧은 메시지를 적어주세요."
        />

        <label htmlFor="set-log-file">사진 또는 영상</label>
        <input
          ref={fileInputRef}
          id="set-log-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            setSelectedFile(file);
            setError(file ? validateFile(file) ?? '' : '');
          }}
        />

        {selectedFile && (
          <p className="set-logs-file-name">
            선택한 파일: {selectedFile.name}
          </p>
        )}

        {error && (
          <p className="members-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            (!message.trim() && !selectedFile) ||
            Boolean(selectedFile && validateFile(selectedFile))
          }
        >
          {submitting ? '등록 중...' : 'SetLog 등록'}
        </button>
      </form>

      <div className="set-logs-list" aria-live="polite">
        <h3>최근 SetLog</h3>

        {loading ? (
          <p role="status">SetLog를 불러오는 중...</p>
        ) : visibleEntries.length === 0 ? (
          <p>아직 등록된 SetLog가 없습니다.</p>
        ) : (
          visibleEntries.map((entry) => (
            <article className="set-log-card" key={entry.id}>
              <div className="set-log-meta">
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString('ko-KR')}
                </time>
                <span>{formatRemaining(entry.expiresAt, now)}</span>
              </div>

              {entry.message && (
                <p className="set-log-message">{entry.message}</p>
              )}

              {entry.media.map((media) =>
                media.mimeType.startsWith('video/') ? (
                  <video
                    className="set-log-media"
                    key={media.id}
                    controls
                    preload="metadata"
                  >
                    <source src={media.url} type={media.mimeType} />
                    영상을 재생할 수 없습니다.
                  </video>
                ) : (
                  <img
                    className="set-log-media"
                    key={media.id}
                    src={media.url}
                    alt="SetLog 첨부 사진"
                    loading="lazy"
                  />
                )
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default SetLogs;