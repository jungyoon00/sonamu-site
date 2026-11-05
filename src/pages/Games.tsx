import { useState } from 'react';
import MergeGame from './MergeGame';
import ColorTiles from './ColorTiles';
import './GamesHub.css';

type SelectedGame = 'menu' | 'sonamu' | 'color-tiles';

function Games() {
  const [selectedGame, setSelectedGame] = useState<SelectedGame>('menu');

  if (selectedGame === 'sonamu') {
    return <MergeGame onBack={() => setSelectedGame('menu')} />;
  }

  if (selectedGame === 'color-tiles') {
    return <ColorTiles onBack={() => setSelectedGame('menu')} />;
  }

  return (
    <section className="games-hub">
      <header>
        <p className="members-eyebrow">SONAMU MEMBERS</p>
        <h2>미니게임</h2>
        <p>플레이할 게임을 선택하세요.</p>
      </header>

      <div className="games-hub-grid">
        <button
          type="button"
          className="games-hub-card"
          onClick={() => setSelectedGame('sonamu')}
        >
          <strong>소나무 머지 게임</strong>
          <span>같은 크기의 소나무 아이콘을 합쳐 더 큰 아이콘을 만드세요.</span>
          <span className="games-hub-card-action">게임 시작 →</span>
        </button>

        <button
          type="button"
          className="games-hub-card"
          onClick={() => setSelectedGame('color-tiles')}
        >
          <strong>Color Tiles</strong>
          <span>빈칸에서 상하좌우로 가장 가까운 타일을 찾아 같은 색을 획득하세요.</span>
          <span className="games-hub-card-action">게임 시작 →</span>
        </button>
      </div>
    </section>
  );
}

export default Games;