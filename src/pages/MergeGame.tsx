import { useEffect, useRef, useState } from 'react';
import {
  Bodies,
  Composite,
  Engine,
  Events,
  type Body,
  type Engine as MatterEngine,
} from 'matter-js';

import stage01 from '../assets/sonamu_merge_stage_01.png';
import stage02 from '../assets/sonamu_merge_stage_02.png';
import stage03 from '../assets/sonamu_merge_stage_03.png';
import stage04 from '../assets/sonamu_merge_stage_04.png';
import stage05 from '../assets/sonamu_merge_stage_05.png';
import stage06 from '../assets/sonamu_merge_stage_06.png';
import stage07 from '../assets/sonamu_merge_stage_07.png';
import stage08 from '../assets/sonamu_merge_stage_08.png';
import stage09 from '../assets/sonamu_merge_stage_09.png';
import sonamuLogo from '../assets/sonamu_logo.png';
import sonamuStandLogo from '../assets/sonamu_stand_logo.jpg';

import { fetchGameRankings, submitGameScore } from '../api/sonamuGame';
import type { GameRanking } from '../api/sonamuGame';
import './Games.css';

const WIDTH = 380;
const HEIGHT = 560;
const DROP_LINE = 112;
const RADII = [13, 17, 22, 28, 35, 43, 52, 62, 73, 86, 100];
const MAX_LEVEL = RADII.length - 1;
const NEXT_LEVEL_COUNT = 5;

const STAGE_IMAGES = [
  stage01,
  stage02,
  stage03,
  stage04,
  stage05,
  stage06,
  stage07,
  stage08,
  stage09,
  sonamuLogo,
  sonamuStandLogo,
];

const STAGE_LABELS = [
  '1단계 솔방울',
  '2단계 솔방울',
  '3단계 솔방울',
  '4단계 소나무',
  '5단계 소나무',
  '6단계 소나무',
  '7단계 소나무',
  '8단계 소나무',
  '9단계 소나무',
  '10단계 소나무 로고',
  '11단계 스탠드 로고',
];

// 1~10단계 오브젝트의 합체 점수.
// 11단계 두 개가 합쳐질 때는 아래에서 별도로 100점을 부여합니다.
const MERGE_POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

const STAGE_FILLS = [
  '#fff0df',
  '#ffe0d2',
  '#f9d4dc',
  '#f2d8f5',
  '#dfd8ff',
  '#d6e4ff',
  '#d5f2ee',
  '#e0f0d0',
  '#fff0bb',
  '#ffdfb2',
  '#f4c9c5',
];

function getLevel(body: Body): number {
  return Number(body.plugin.sonamuLevel ?? 0);
}

function pickNextLevel(): number {
  return Math.floor(Math.random() * NEXT_LEVEL_COUNT);
}

function drawStageImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  maxSize: number,
  clipRadius?: number
) {
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
    return;
  }

  const scale = Math.min(
    maxSize / image.naturalWidth,
    maxSize / image.naturalHeight
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  ctx.save();

  if (clipRadius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
    ctx.clip();
  }

  ctx.drawImage(
    image,
    centerX - width / 2,
    centerY - height / 2,
    width,
    height
  );

  ctx.restore();
}

function SonamuGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatterEngine | null>(null);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextLevel, setNextLevel] = useState(pickNextLevel);
  const nextLevelRef = useRef(nextLevel);
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('sonamu-game-player-name') ?? ''
  );
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchGameRankings()
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch(() => {
        if (active) setError('랭킹을 불러오지 못했습니다.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (context === null) return;

    const ctx: CanvasRenderingContext2D = context;
    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    engineRef.current = engine;

    const wallOptions = { isStatic: true, restitution: 0.1 };
    Composite.add(engine.world, [
      Bodies.rectangle(WIDTH / 2, HEIGHT + 20, WIDTH, 40, wallOptions),
      Bodies.rectangle(-20, HEIGHT / 2, 40, HEIGHT, wallOptions),
      Bodies.rectangle(WIDTH + 20, HEIGHT / 2, 40, HEIGHT, wallOptions),
    ]);

    const images = STAGE_IMAGES.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    let animationFrame = 0;
    let dropX = WIDTH / 2;
    const mergeQueue: [Body, Body][] = [];
    const merging = new Set<number>();

    function makeObject(x: number, y: number, level: number): Body {
      const radius = RADII[level];

      const body = Bodies.circle(x, y, radius, {
        restitution: 0.12,
        friction: 0.12,
        frictionAir: 0.005,
        density: 0.001,
      });

      body.plugin.sonamuLevel = level;
      body.plugin.dangerSince = 0;
      return body;
    }

    function updateScore(amount: number) {
      scoreRef.current += amount;
      setScore(scoreRef.current);
      setSaved(false);
    }

    function isInWorld(body: Body) {
      return Composite.allBodies(engine.world).some(
        (current) => current.id === body.id
      );
    }

    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;

        if (
          a.isStatic ||
          b.isStatic ||
          getLevel(a) !== getLevel(b) ||
          merging.has(a.id) ||
          merging.has(b.id)
        ) {
          continue;
        }

        merging.add(a.id);
        merging.add(b.id);
        mergeQueue.push([a, b]);
      }
    });

    Events.on(engine, 'afterUpdate', () => {
      while (mergeQueue.length) {
        const [a, b] = mergeQueue.shift()!;
        if (!isInWorld(a) || !isInWorld(b)) continue;

        const currentLevel = getLevel(a);
        const x = (a.position.x + b.position.x) / 2;
        const y = (a.position.y + b.position.y) / 2;

        Composite.remove(engine.world, [a, b]);

        if (currentLevel === MAX_LEVEL) {
          updateScore(66);
        } else {
          Composite.add(
            engine.world,
            makeObject(x, y, currentLevel + 1)
          );
          updateScore(MERGE_POINTS[currentLevel]);
        }

        merging.delete(a.id);
        merging.delete(b.id);
      }
    });

    function draw() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#f7f7f7';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#777';
      ctx.beginPath();
      ctx.moveTo(0, DROP_LINE);
      ctx.lineTo(WIDTH, DROP_LINE);
      ctx.stroke();
      ctx.restore();

      if (!gameOverRef.current) {
        const previewLevel = nextLevelRef.current;
        const previewRadius = RADII[previewLevel];

        ctx.globalAlpha = 0.45;
        drawStageImage(
          ctx,
          images[previewLevel],
          dropX,
          42,
          previewRadius * 1.45
        );
        ctx.globalAlpha = 1;
      }

      for (const body of Composite.allBodies(engine.world)) {
        if (body.isStatic) continue;

        const level = getLevel(body);
        const radius = RADII[level];

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        ctx.fillStyle = STAGE_FILLS[level] ?? '#fff0df';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2 + level * 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        drawStageImage(
          ctx,
          images[level],
          0,
          0,
          radius * 1.6,
          radius * 0.84
        );

        ctx.restore();
      }
    }

    function loop() {
      if (!gameOverRef.current) {
        Engine.update(engine, 1000 / 60);

        const now = Date.now();

        for (const body of Composite.allBodies(engine.world)) {
          if (body.isStatic) continue;

          const radius = RADII[getLevel(body)];
          const nearTop = body.position.y - radius < DROP_LINE;

          if (nearTop && body.speed < 0.35) {
            body.plugin.dangerSince ||= now;

            if (now - body.plugin.dangerSince > 1500) {
              gameOverRef.current = true;
              setGameOver(true);
              break;
            }
          } else {
            body.plugin.dangerSince = 0;
          }
        }
      }

      draw();
      animationFrame = window.requestAnimationFrame(loop);
    }

    loop();

    function getDropX(event: PointerEvent): number {
      const target = event.currentTarget;

      if (!(target instanceof HTMLCanvasElement)) {
        return dropX;
      }

      const rect = target.getBoundingClientRect();
      const scaleX = WIDTH / target.clientWidth;
      const contentX = event.clientX - rect.left - target.clientLeft;

      return Math.max(
        RADII[0] + 4,
        Math.min(WIDTH - RADII[0] - 4, contentX * scaleX)
      );
    }

    function handlePointerMove(event: PointerEvent) {
      dropX = getDropX(event);
    }

    function handlePointerDown(event: PointerEvent) {
      event.preventDefault();
      if (gameOverRef.current) return;

      dropX = getDropX(event);

      const droppedLevel = nextLevelRef.current;
      Composite.add(engine.world, makeObject(dropX, 75, droppedLevel));

      const upcomingLevel = pickNextLevel();
      nextLevelRef.current = upcomingLevel;
      setNextLevel(upcomingLevel);
    }

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      Events.off(engine, 'collisionStart');
      Events.off(engine, 'afterUpdate');
      Engine.clear(engine);
      engineRef.current = null;
    };
  }, []);

  function restart() {
    const engine = engineRef.current;
    if (!engine) return;

    const dynamicBodies = Composite.allBodies(engine.world).filter(
      (body) => !body.isStatic
    );
    Composite.remove(engine.world, dynamicBodies);

    const firstNextLevel = pickNextLevel();
    nextLevelRef.current = firstNextLevel;
    setNextLevel(firstNextLevel);

    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
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
      const result = await submitGameScore(name, score);
      localStorage.setItem('sonamu-game-player-name', name);
      setRankings(result);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '점수를 저장하지 못했습니다.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sonamu-game-page">
      <header>
        <button type="button" onClick={onBack}>
          게임 선택
        </button>
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>소나무 머지 게임</h2>
        <p>같은 단계의 소나무 이미지를 합쳐 더 큰 단계로 키워보세요.</p>
      </header>

      <div className="sonamu-game-layout">
        <div className="sonamu-game-board">
          <div className="sonamu-game-hud">
            <div className="sonamu-game-score">
              점수 <strong>{score}</strong>
            </div>

            <div className="sonamu-game-next">
              <span>다음 오브젝트</span>
              <img
                src={STAGE_IMAGES[nextLevel]}
                alt={STAGE_LABELS[nextLevel]}
              />
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            aria-label="소나무 머지 게임 보드"
          />

          {gameOver && (
            <div className="sonamu-game-over">
              <h3>게임 종료</h3>
              <p>최종 점수: {score}</p>
              {saved
                ? '기록을 저장했습니다.'
                : '현재 점수는 오른쪽 랭킹 패널에서 등록할 수 있습니다.'}
              <button type="button" onClick={restart}>
                다시 하기
              </button>
            </div>
          )}
        </div>

        <aside className="sonamu-game-ranking">
          <div className="sonamu-game-record-controls">
            <label htmlFor="sonamu-game-player-name">기록할 이름</label>
            <input
              id="sonamu-game-player-name"
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
                  : gameOver
                    ? '최종 점수 등록'
                    : '현재 점수 등록'}
            </button>
          </div>

          <h3>랭킹 TOP 5</h3>
          {rankings.length === 0 ? (
            <p>아직 기록이 없습니다.</p>
          ) : (
            <ol>
              {rankings.slice(0, 5).map((row) => (
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

export default SonamuGame;