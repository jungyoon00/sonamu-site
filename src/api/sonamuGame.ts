export type GameRanking = {
  rank: number;
  playerName: string;
  score: number;
  updatedAt: string;
};

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
        : '게임 기록 요청에 실패했습니다.'
    );
  }

  return body as T;
}

export async function fetchGameRankings(): Promise<GameRanking[]> {
  const result = await requestJson<{ rankings: GameRanking[] }>(
    '/api/sonamu-game-scores'
  );
  return result.rankings;
}

export async function submitGameScore(
  name: string,
  score: number
): Promise<GameRanking[]> {
  const result = await requestJson<{ rankings: GameRanking[] }>(
    '/api/sonamu-game-scores',
    {
      method: 'POST',
      body: JSON.stringify({ name, score }),
    }
  );
  return result.rankings;
}