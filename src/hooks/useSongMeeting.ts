import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSongMeetingSong,
  createSongMeetingTab,
  deleteSongMeetingSong,
  fetchSongMeeting,
  setSongConfirmed,
  setSongReview,
  updateSongField,
} from '../api/songMeeting';
import type {
  SongField,
  SongMeetingSong,
  SongMeetingTab,
} from '../api/songMeeting';

type Drafts = Record<string, string>;

const EDITABLE_FIELDS: SongField[] = [
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
];

function draftKey(songId: string, field: SongField): string {
  return `${songId}:${field}`;
}

export function useSongMeeting() {
  const [tabs, setTabs] = useState<SongMeetingTab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [drafts, setDrafts] = useState<Drafts>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Ref는 비동기 조회와 저장이 최신 임시 입력값을 읽는 데만 사용합니다.
  // 렌더 중에는 ref를 수정하지 않습니다.
  const draftsRef = useRef<Drafts>({});
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;

    try {
      const latestTabs = await fetchSongMeeting();
      const currentDrafts = draftsRef.current;

      const mergedTabs = latestTabs.map((tab) => ({
        ...tab,
        songs: tab.songs.map((song) => {
          let mergedSong = song;

          for (const field of EDITABLE_FIELDS) {
            const key = draftKey(song.id, field);
            if (Object.prototype.hasOwnProperty.call(currentDrafts, key)) {
              mergedSong = {
                ...mergedSong,
                [field]: currentDrafts[key],
              };
            }
          }

          return mergedSong;
        }),
      }));

      setTabs(mergedTabs);
      setActiveTabId((currentId) => currentId || latestTabs[0]?.id || '');
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '선곡회의를 불러오지 못했습니다.'
      );
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    const pollTimer = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
    };
  }, [refresh]);

  const updateSongInState = useCallback((updatedSong: SongMeetingSong) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => ({
        ...tab,
        songs: tab.songs.map((song) =>
          song.id === updatedSong.id ? updatedSong : song
        ),
      }))
    );
  }, []);

  const changeDraft = useCallback(
    (songId: string, field: SongField, value: string) => {
      const key = draftKey(songId, field);
      const nextDrafts = { ...draftsRef.current, [key]: value };

      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
    },
    []
  );

  const saveDraft = useCallback(
    async (songId: string, field: SongField) => {
      const key = draftKey(songId, field);
      if (!Object.prototype.hasOwnProperty.call(draftsRef.current, key)) return;

      const value = draftsRef.current[key];

      try {
        const savedSong = await updateSongField(songId, field, value);
        updateSongInState(savedSong);

        // 저장 요청 중 사용자가 다시 편집했다면 새 임시값은 유지합니다.
        if (draftsRef.current[key] === value) {
          const nextDrafts = { ...draftsRef.current };
          delete nextDrafts[key];
          draftsRef.current = nextDrafts;
          setDrafts(nextDrafts);
        }

        setError('');
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : '수정 내용을 저장하지 못했습니다.'
        );
      }
    },
    [updateSongInState]
  );

  const addTab = useCallback(async (name: string) => {
    const tab = await createSongMeetingTab(name);
    setTabs((currentTabs) => [...currentTabs, tab]);
    setActiveTabId(tab.id);
    return tab;
  }, []);

  const addSong = useCallback(async (tabId: string) => {
    const song = await createSongMeetingSong(tabId);

    setTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.id === tabId ? { ...tab, songs: [...tab.songs, song] } : tab
      )
    );

    return song;
  }, []);

  const toggleReview = useCallback(
    async (song: SongMeetingSong) => {
      const updatedSong = await setSongReview(
        song.id,
        !song.promoted_to_review
      );
      updateSongInState(updatedSong);
    },
    [updateSongInState]
  );

  const toggleConfirmed = useCallback(
    async (song: SongMeetingSong, confirmedPosition: number | null) => {
      const updatedSong = await setSongConfirmed(
        song.id,
        !song.is_confirmed,
        confirmedPosition
      );
      updateSongInState(updatedSong);
    },
    [updateSongInState]
  );

  const removeSong = useCallback(
    async (songId: string) => {
      await deleteSongMeetingSong(songId);
      setTabs((currentTabs) =>
        currentTabs.map((tab) => ({
          ...tab,
          songs: tab.songs.filter((song) => song.id !== songId),
        }))
      );
    },
    []
  );

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab: tabs.find((tab) => tab.id === activeTabId) ?? null,
    drafts,
    error,
    loading,
    refresh,
    changeDraft,
    saveDraft,
    addTab,
    addSong,
    toggleReview,
    toggleConfirmed,
    removeSong,
  };
}