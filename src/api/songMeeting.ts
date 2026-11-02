export type SongMeetingSong = {
  id: string;
  tab_id: string;
  position: number;
  artist: string;
  title: string;
  video_url: string | null;
  vocal: string | null;
  drums: string | null;
  guitar_1: string | null;
  guitar_2: string | null;
  bass: string | null;
  keyboard_1: string | null;
  keyboard_2: string | null;
  free_opinion: string;
  promoted_to_review: boolean;
  is_confirmed: boolean;
  confirmed_position: number | null;
  created_at: string;
  updated_at: string;
};

export type SongMeetingTab = {
  id: string;
  name: string;
  position: number;
  created_at: string;
  songs: SongMeetingSong[];
};

export type SongField =
  | 'artist'
  | 'title'
  | 'video_url'
  | 'vocal'
  | 'drums'
  | 'guitar_1'
  | 'guitar_2'
  | 'bass'
  | 'keyboard_1'
  | 'keyboard_2'
  | 'free_opinion';

async function requestJson<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : '선곡회의 요청에 실패했습니다.'
    );
  }

  return body as T;
}

export async function fetchSongMeeting(): Promise<SongMeetingTab[]> {
  const result = await requestJson<{ tabs: SongMeetingTab[] }>(
    '/api/song-meeting'
  );
  return result.tabs;
}

export async function createSongMeetingTab(
  name: string
): Promise<SongMeetingTab> {
  const result = await requestJson<{ tab: SongMeetingTab }>(
    '/api/song-meeting',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'create_tab', name }),
    }
  );
  return result.tab;
}

export async function createSongMeetingSong(
  tabId: string
): Promise<SongMeetingSong> {
  const result = await requestJson<{ song: SongMeetingSong }>(
    '/api/song-meeting',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'create_song', tabId }),
    }
  );
  return result.song;
}

export async function updateSongField(
  songId: string,
  field: SongField,
  value: string
): Promise<SongMeetingSong> {
  const result = await requestJson<{ song: SongMeetingSong }>(
    '/api/song-meeting',
    {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'update_field',
        songId,
        field,
        value,
      }),
    }
  );
  return result.song;
}

export async function setSongReview(
  songId: string,
  value: boolean
): Promise<SongMeetingSong> {
  const result = await requestJson<{ song: SongMeetingSong }>(
    '/api/song-meeting',
    {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set_review', songId, value }),
    }
  );
  return result.song;
}

export async function setSongConfirmed(
  songId: string,
  value: boolean,
  confirmedPosition: number | null = null
): Promise<SongMeetingSong> {
  const result = await requestJson<{ song: SongMeetingSong }>(
    '/api/song-meeting',
    {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'set_confirmed',
        songId,
        value,
        confirmedPosition,
      }),
    }
  );
  return result.song;
}

export async function deleteSongMeetingSong(songId: string): Promise<void> {
  await requestJson<{ success: boolean }>('/api/song-meeting', {
    method: 'DELETE',
    body: JSON.stringify({ songId }),
  });
}