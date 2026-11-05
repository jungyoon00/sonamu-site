import { useEffect, useRef, useState } from 'react';
import {
  fetchColorTilesRankings,
  submitColorTilesScore,
} from '../api/colorTilesGame.ts';
import type { ColorTilesRanking } from '../api/colorTilesGame.ts';
import './ColorTiles.css';

const ROWS = 12;
const COLS = 20;
const TILE_COUNT = 200;
const TILES_PER_COLOR = 20;
const START_SECONDS = 120;

const COLORS = [
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'cyan',
  'blue',
  'purple',
  'magenta',
  'pink',
] as const;

type TileColor = (typeof COLORS)[number];
type Cell = TileColor | null;
type Phase = 'playing' | 'time-up' | 'overtime' | 'complete';

const COLOR_LABELS: Record<TileColor, string> = {
  red: '빨강',
  orange: '주황',
  yellow: '노랑',
  lime: '라임',
  green: '초록',
  cyan: '시안',
  blue: '파랑',
  purple: '보라',
  magenta: '마젠타',
  pink: '분홍',
};

function createBoard(): Cell[] {
  const cells: Cell[] = Array(ROWS * COLS).fill(null);
  const positions = Array.from({ length: cells.length }, (_, index) => index);
  const tiles: TileColor[] = COLORS.flatMap((color) =>
    Array<TileColor>(TILES_PER_COLOR).fill(color)
  );

  for (let index = positions.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[randomIndex]] = [
      positions[randomIndex],
      positions[index],
    ];
  }

  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [tiles[index], tiles[randomIndex]] = [
      tiles[randomIndex],
      tiles[index],
    ];
  }

  positions.slice(0, TILE_COUNT).forEach((position, index) => {
    cells[position] = tiles[index];
  });

  return cells;
}

function getNearestTiles(board: Cell[], index: number): number[] {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const nearest: number[] = [];

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [rowStep, colStep] of directions) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
      nextRow >= 0 &&
      nextRow < ROWS &&
      nextCol >= 0 &&
      nextCol < COLS
    ) {
      const nextIndex = nextRow * COLS + nextCol;

      if (board[nextIndex]) {
        nearest.push(nextIndex);
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  }

  return nearest;
}

function ColorTiles({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Cell[]>(createBoard);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(START_SECONDS);
  const [phase, setPhase] = useState<Phase>('playing');
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('color-tiles-player-name') ?? ''
  );
  const [rankings, setRankings] = useState<ColorTilesRanking[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fallingTiles, setFallingTiles] = useState<number[]>([]);
  const [animating, setAnimating] = useState(false);

  const animationTimer = useRef<number | null>(null);
  const timePercent = (secondsLeft / START_SECONDS) * 100;

  useEffect(() => {
    let active = true;

    void fetchColorTilesRankings()
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch(() => {
        if (active) setError('Color Tiles 랭킹을 불러오지 못했습니다.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = window.setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0);
        setPhase('time-up');
      } else {
        setSecondsLeft((current) => current - 1);
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [phase, secondsLeft]);

  useEffect(() => {
    return () => {
      if (animationTimer.current !== null) {
        window.clearTimeout(animationTimer.current);
      }
    };
  }, []);

  function tapCell(index: number) {
    if (animating || (phase !== 'playing' && phase !== 'overtime')) return;
    if (board[index] !== null) return;

    const nearest = getNearestTiles(board, index);
    const counts = new Map<TileColor, number>();

    for (const tileIndex of nearest) {
      const color = board[tileIndex];
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    }

    const matched = nearest.filter((tileIndex) => {
      const color = board[tileIndex];
      return color !== null && (counts.get(color) ?? 0) >= 2;
    });

    if (matched.length === 0) {
      if (phase === 'playing') {
        if (secondsLeft <= 5) {
          setSecondsLeft(0);
          setPhase('time-up');
        } else {
          setSecondsLeft((current) => current - 5);
        }
      }
      return;
    }

    const remainingTiles = board.reduce(
      (count, cell, cellIndex) =>
        count + (cell !== null && !matched.includes(cellIndex) ? 1 : 0),
      0
    );

    setAnimating(true);
    setFallingTiles(matched);

    if (phase === 'playing') {
      setScore((current) => current + matched.length);
      setSaved(false);
    }

    animationTimer.current = window.setTimeout(() => {
      setBoard((current) =>
        current.map((cell, cellIndex) =>
          matched.includes(cellIndex) ? null : cell
        )
      );

      setFallingTiles([]);
      setAnimating(false);
      animationTimer.current = null;

      if (remainingTiles === 0) {
        setPhase('complete');
      }
    }, 520);
  }

  function restart() {
    if (animationTimer.current !== null) {
      window.clearTimeout(animationTimer.current);
      animationTimer.current = null;
    }

    setFallingTiles([]);
    setAnimating(false);
    setBoard(createBoard());
    setScore(0);
    setSecondsLeft(START_SECONDS);
    setPhase('playing');
    setSaved(false);
    setError('');
  }

  async function saveScore() {
    const name = playerName.trim();

    if (!name || [...name].length > 20) {
      setError('이름을 1자 이상 20자 이하로 입력하세요.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await submitColorTilesScore(name, score);
      localStorage.setItem('color-tiles-player-name', name);
      setRankings(result);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Color Tiles 점수를 저장하지 못했습니다.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="color-tiles-page">
      <header className="color-tiles-heading">
        <button type="button" className="color-tiles-back" onClick={onBack}>
          ← 게임 선택
        </button>
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>Color Tiles</h2>
        <p>빈칸을 눌러 네 방향의 가장 가까운 타일 중 같은 색을 획득하세요.</p>
      </header>

      <div className="color-tiles-layout">
        <div className="color-tiles-game">
          <div className="color-tiles-status">
            <span>
              점수 <strong>{score}</strong>
            </span>
            <span>
              {phase === 'overtime'
                ? '시간 종료 후 계속 플레이'
                : `남은 시간 ${secondsLeft}초`}
            </span>
          </div>

          <div
            className="color-tiles-timebar"
            role="progressbar"
            aria-label="남은 시간"
            aria-valuemin={0}
            aria-valuemax={START_SECONDS}
            aria-valuenow={secondsLeft}
          >
            <div
              className={`color-tiles-timebar-fill ${
                secondsLeft <= 20 ? 'is-low' : ''
              }`}
              style={{ width: `${timePercent}%` }}
            />
          </div>

          <div
            className="color-tiles-board"
            role="group"
            aria-label="Color Tiles 보드"
          >
            {board.map((color, index) => (
              <button
                key={index}
                type="button"
                className={[
                  'color-tile',
                  color ? `tile-${color}` : 'tile-empty',
                  fallingTiles.includes(index) ? 'is-falling' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={
                  color !== null ||
                  animating ||
                  (phase !== 'playing' && phase !== 'overtime')
                }
                aria-label={
                  color
                    ? `${COLOR_LABELS[color]} 타일`
                    : `빈칸 ${index + 1}`
                }
                onClick={() => tapCell(index)}
              />
            ))}
          </div>

          {(phase === 'time-up' || phase === 'complete') && (
            <div className="color-tiles-result" role="status">
              <h3>{phase === 'complete' ? '모든 타일 획득!' : '시간 종료'}</h3>
              <p>점수: {score}</p>
              {phase === 'time-up' && (
                <button type="button" onClick={() => setPhase('overtime')}>
                  점수 확정 후 계속 플레이
                </button>
              )}
              <button type="button" onClick={restart}>
                다시 하기
              </button>
            </div>
          )}
        </div>

        <aside className="color-tiles-ranking">
          <div className="color-tiles-record-controls">
            <label htmlFor="color-tiles-player-name">기록할 이름</label>
            <input
              id="color-tiles-player-name"
              value={playerName}
              maxLength={20}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="이름을 입력하세요"
            />
            <button
              type="button"
              disabled={saving || saved}
              onClick={() => void saveScore()}
            >
              {saving
                ? '저장 중...'
                : saved
                  ? '현재 점수 등록됨'
                  : '현재 점수 등록'}
            </button>
          </div>

          <h3>Color Tiles 랭킹 TOP 5</h3>
          {rankings.length === 0 ? (
            <p>아직 기록이 없습니다.</p>
          ) : (
            <ol>
              {rankings.map((row) => (
                <li key={row.rank}>
                  <span>
                    {row.rank}. {row.playerName}
                  </span>
                  <strong>{row.score}</strong>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {error && (
        <p className="members-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default ColorTiles;