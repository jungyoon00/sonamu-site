import { useEffect, useRef, useState } from 'react';
import {
  Bodies,
  Composite,
  Engine,
  Events,
  type Body,
  type Engine as MatterEngine,
} from 'matter-js';

import sonamuLogo from '../assets/sonamu_logo.png';
import { fetchGameRankings, submitGameScore } from '../api/sonamuGame';
import type { GameRanking } from '../api/sonamuGame';
import './Games.css';

const WIDTH = 380;
const HEIGHT = 560;
const DROP_LINE = 112;
const RADII = [18, 25, 33, 43, 55, 69, 86];
const MAX_LEVEL = RADII.length - 1;
const STAGE_FILLS = [
  '#ffffff',
  '#f0f0f0',
  '#e2e2e2',
  '#d2d2d2',
  '#c0c0c0',
  '#adadad',
  '#999999',
];

function getLevel(body: Body): number {
  return Number(body.plugin.sonamuLevel ?? 0);
}

function MergeGame({onBack}: {onBack: () => void}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatterEngine | null>(null);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
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

    const logo = new Image();
    logo.src = sonamuLogo;

    function drawLogo(centerX: number, centerY: number, maxSize: number) {
      if (!logo.complete || logo.naturalWidth === 0 || logo.naturalHeight === 0) {
        return;
      }

      const aspectRatio = logo.naturalWidth / logo.naturalHeight;
      const width = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio;
      const height = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize;

      ctx.drawImage(
        logo,
        centerX - width / 2,
        centerY - height / 2,
        width,
        height
      );
    }

    let animationFrame = 0;
    let dropX = WIDTH / 2;
    let nextLevel = 0;
    const mergeQueue: [Body, Body][] = [];
    const merging = new Set<number>();

    function makeFruit(x: number, y: number, level: number): Body {
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
          getLevel(a) >= MAX_LEVEL ||
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

        const level = getLevel(a) + 1;
        const x = (a.position.x + b.position.x) / 2;
        const y = (a.position.y + b.position.y) / 2;

        Composite.remove(engine.world, [a, b]);
        Composite.add(engine.world, makeFruit(x, y, level));
        merging.delete(a.id);
        merging.delete(b.id);
        updateScore(level * 10);
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
        const previewRadius = RADII[nextLevel];
        ctx.globalAlpha = 0.45;
        drawLogo(dropX, 42, previewRadius * 1.44);
        ctx.globalAlpha = 1;
      }

      for (const body of Composite.allBodies(engine.world)) {
        if (body.isStatic) continue;

        const level = getLevel(body);
        const radius = RADII[level];

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        ctx.fillStyle = STAGE_FILLS[level] ?? '#ffffff';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2 + level * 0.45;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        drawLogo(0, 0, radius * 1.44);

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

      Composite.add(engine.world, makeFruit(dropX, 75, nextLevel));
      nextLevel = Math.random() < 0.75 ? 0 : Math.min(1, MAX_LEVEL);
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
        <button type='button' onClick={onBack}>
          게임 선택
        </button>
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>소나무 머지 게임</h2>
        <p>같은 크기의 소나무 아이콘을 합쳐 더 큰 아이콘을 만들어보세요.</p>
      </header>

      <div className="sonamu-game-layout">
        <div className="sonamu-game-board">
          <div className="sonamu-game-score">점수 <strong>{score}</strong></div>
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
                  <span>{row.rank}. {row.playerName}</span>
                  <strong>{row.score}</strong>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {error && <p className="members-error" role="alert">{error}</p>}
    </section>
  );
}

export default MergeGame;