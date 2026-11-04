import { useMemo } from 'react';
import { useSongMeeting } from '../hooks/useSongMeeting';
import type {
  SongField,
  SongMeetingSong,
} from '../api/songMeeting';
import './SongMeeting.css';

const TEXT_FIELDS: { field: SongField; label: string }[] = [
  { field: 'artist', label: '아티스트' },
  { field: 'title', label: '곡명' },
  { field: 'video_url', label: '영상 링크' },
];

const SESSION_FIELDS: { field: SongField; label: string }[] = [
  { field: 'vocal', label: '보컬' },
  { field: 'drums', label: '드럼' },
  { field: 'guitar_1', label: '기타 1' },
  { field: 'guitar_2', label: '기타 2' },
  { field: 'bass', label: '베이스' },
  { field: 'keyboard_1', label: '키보드 1' },
  { field: 'keyboard_2', label: '키보드 2' },
];

function getCompleteness(song: SongMeetingSong) {
  const requiredFields = SESSION_FIELDS.filter(
    ({ field }) => (song[field] ?? '').trim() !== '-'
  );
  const emptyCount = requiredFields.filter(
    ({ field }) => !(song[field] ?? '').trim()
  ).length;

  if (requiredFields.length > 0 && emptyCount === 0) return 'complete';
  if (emptyCount === 1) return 'almost';
  return 'normal';
}

function SongMeeting() {
  const meeting = useSongMeeting();
  const songs = meeting.activeTab?.songs ?? [];

  const completeSongs = useMemo(
    () => songs.filter((song) => getCompleteness(song) === 'complete'),
    [songs]
  );
  const almostSongs = useMemo(
    () => songs.filter((song) => getCompleteness(song) === 'almost'),
    [songs]
  );
  const manualReviewSongs = useMemo(
    () =>
      songs.filter(
        (song) =>
          song.promoted_to_review &&
          getCompleteness(song) === 'normal' &&
          !song.is_confirmed
      ),
    [songs]
  );
  const confirmedSongs = useMemo(
    () =>
      songs
        .filter((song) => song.is_confirmed)
        .sort(
          (a, b) =>
            (a.confirmed_position ?? Number.MAX_SAFE_INTEGER) -
            (b.confirmed_position ?? Number.MAX_SAFE_INTEGER)
        ),
    [songs]
  );

  async function runAction(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (cause) {
      window.alert(
        cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.'
      );
    }
  }

  function renderRows(rows: SongMeetingSong[]) {
    return rows.map((song) => {
      const status = getCompleteness(song);

      return (
        <tr
          key={song.id}
          className={
            status === 'complete'
              ? 'song-row-complete'
              : status === 'almost'
                ? 'song-row-almost'
                : ''
          }
        >
          {[...TEXT_FIELDS, ...SESSION_FIELDS].map(({ field, label }) => {
            const key = `${song.id}:${field}`;
            const value = meeting.drafts[key] ?? song[field] ?? '';

            return (
              <td key={field}>
                <input
                  aria-label={`${song.title || '새 곡'} ${label}`}
                  value={value}
                  placeholder={field.startsWith('guitar') ||
                    field.startsWith('keyboard')
                    ? '이름 또는 -'
                    : label}
                  onChange={(event) =>
                    meeting.changeDraft(song.id, field, event.target.value)
                  }
                  onBlur={() => void meeting.saveDraft(song.id, field)}
                />
              </td>
            );
          })}

          <td>
            <textarea
              aria-label={`${song.title || '새 곡'} 자유 의견`}
              value={
                meeting.drafts[`${song.id}:free_opinion`] ??
                song.free_opinion ??
                ''
              }
              placeholder="자유 의견"
              onChange={(event) =>
                meeting.changeDraft(
                  song.id,
                  'free_opinion',
                  event.target.value
                )
              }
              onBlur={() => void meeting.saveDraft(song.id, 'free_opinion')}
            />
          </td>

          <td>
            <div className="song-meeting-action-buttons">
              <button
                className="song-meeting-icon-button"
                type="button"
                title={song.promoted_to_review ? '검토 후보에서 내리기' : '검토 후보로 올리기'}
                aria-label={song.promoted_to_review ? '검토 후보에서 내리기' : '검토 후보로 올리기'}
                onClick={() => void runAction(() => meeting.toggleReview(song))}
              >
                {song.promoted_to_review ? '↑' : '↓'}
              </button>

              <button
                className="song-meeting-delete-button"
                type="button"
                onClick={() => {
                  if (window.confirm('이 곡을 DB에서도 삭제할까요?')) {
                    void runAction(() => meeting.removeSong(song.id));
                  }
                }}
              >
                삭제
              </button>
            </div>
          </td>
        </tr>
      );
    });
  }

  function renderSongGroup(title: string, rows: SongMeetingSong[], isConfirmedGroup = false) {
    return (
      <section className="song-meeting-list" key={title}>
        <h3>
          {title} <span>{rows.length}</span>
        </h3>

        {rows.length === 0 ? (
          <p>해당 곡이 없습니다.</p>
        ) : (
          <div className="song-meeting-table-wrap">
            <table className="song-meeting-table song-meeting-summary-table">
              <thead>
                <tr>
                  <th>아티스트</th>
                  <th>곡명</th>
                  <th>영상 링크</th>
                  {SESSION_FIELDS.map(({ field, label }) => (
                    <th key={field}>{label}</th>
                  ))}
                  <th>자유 의견</th>
                  <th>선택</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((song) => (
                  <tr key={song.id}>
                    <td>{song.artist || '—'}</td>
                    <td>{song.title || '—'}</td>
                    <td>
                      {song.video_url ? (
                        <a
                          href={song.video_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          영상 보기
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    {SESSION_FIELDS.map(({ field }) => (
                      <td key={field}>{song[field] || '—'}</td>
                    ))}
                    <td className="song-meeting-opinion">
                      {song.free_opinion || '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(() =>
                            meeting.toggleConfirmed(
                              song,
                              confirmedSongs.length
                            )
                          )
                        }
                      >
                        {song.is_confirmed
                          ? '확정 해제'
                          : isConfirmedGroup
                            ? '확정됨'
                            : '최종 선곡 확정'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  async function addTab() {
    const name = window.prompt('새 탭 이름을 입력하세요.');
    if (name?.trim()) {
      await runAction(() => meeting.addTab(name.trim()));
    }
  }

  function exportCurrentTabCsv() {
    const tab = meeting.activeTab;
    if (!tab) return;

    const headers = [
      ...TEXT_FIELDS.map(({ label }) => label),
      ...SESSION_FIELDS.map(({ label }) => label),
      '자유 의견',
       '검토 후보',
      '최종 확정',
    ];

    function escapeCsvCell(value: unknown): string {
      return `"${String(value ?? '').replaceAll('"', '""')}"`;
    }

    const rows = songs.map((song) => [
      ...TEXT_FIELDS.map(({ field }) => song[field] ?? ''),
      ...SESSION_FIELDS.map(({ field }) => song[field] ?? ''),
      song.free_opinion ?? '',
      song.promoted_to_review ? 'TRUE' : 'FALSE',
      song.is_confirmed ? 'TRUE' : 'FALSE',
    ]);

    const csv = '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n');

    const blobUrl = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    const safeTabName = tab.name.replace(/[\\/:*?"<>|]/g, '_');

    link.href = blobUrl;
    link.download = `선곡회의_${safeTabName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }

  return (
    <section className="song-meeting-page">
      <header className="song-meeting-heading">
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>선곡회의</h2>
        <p>곡과 세션 구성을 함께 채워주세요. 입력한 내용은 셀에서 나갈 때 저장됩니다.</p>
      </header>

      <nav className="song-meeting-tabs" aria-label="선곡회의 탭">
        {meeting.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={tab.id === meeting.activeTabId}
            onClick={() => meeting.setActiveTabId(tab.id)}
          >
            {tab.name}
          </button>
        ))}
        <button type="button" onClick={() => void addTab()}>
          + 탭 추가
        </button>
        <div className="song-meeting-tab-actions">
          <button
            type="button"
            disabled={!meeting.activeTab}
            onClick={exportCurrentTabCsv}
          >
            CSV 내보내기
          </button>

          <button
            type="button"
            disabled={!meeting.activeTab || meeting.tabs.length <= 1}
            onClick={() => {
              const tab = meeting.activeTab;
              if (!tab) return;

              if (
                window.confirm(
                `'${tab.name}' 탭과 그 안의 곡들을 모두 삭제할까요?`
                )
              ) {
                void runAction(() => meeting.removeTab(tab.id));
              }
            }}
          >
            탭 삭제
          </button>
        </div>
      </nav>

      {meeting.error && (
        <p className="members-error" role="alert">
          {meeting.error}
        </p>
      )}

      {meeting.loading ? (
        <p role="status">선곡회의를 불러오는 중...</p>
      ) : meeting.activeTab ? (
        <>
          <div className="song-meeting-table-wrap">
            <table className="song-meeting-table">
              <thead>
                <tr>
                  {[...TEXT_FIELDS, ...SESSION_FIELDS].map(({ field, label }) => (
                    <th key={field}>{label}</th>
                  ))}
                  <th>자유 의견</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>{renderRows(songs)}</tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              void runAction(() => meeting.addSong(meeting.activeTab!.id))
            }
          >
            + 곡 추가
          </button>

          {renderSongGroup('세션 완성', completeSongs)}
          {renderSongGroup('한 자리 남음', almostSongs)}
          {renderSongGroup('수동 검토 후보', manualReviewSongs)}
          {renderSongGroup('최종 확정', confirmedSongs, true)}
        </>
      ) : (
        <p>선곡 탭이 없습니다. 탭을 추가해 주세요.</p>
      )}
    </section>
  );
}

export default SongMeeting;