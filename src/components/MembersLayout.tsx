import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { logoutMember } from '../api/memberAuth';

function MembersLayout() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError('');

    try {
      await logoutMember();
      // 게이트가 지워진 쿠키를 다시 확인하도록 전체 페이지를 새로 불러옵니다.
      window.location.replace('/members');
    } catch {
      setError('로그아웃에 실패했습니다. 다시 시도해주세요.');
      setLoggingOut(false);
    }
  }

  return (
    <div className="members-layout">
      <header className="members-header">
        <div>
          <p className="members-eyebrow">SONAMU MEMBERS</p>
          <h1>부원 공간</h1>
        </div>

        <button
          type="button"
          className="members-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </header>

      {error && (
        <p className="members-error" role="alert">
          {error}
        </p>
      )}

      <div className="members-page-content">
        <Outlet />
      </div>

      <nav className="members-floating-nav" aria-label="부원 메뉴">
        <NavLink to="/members/blog" className="members-floating-link">
          블로그
        </NavLink>
        <NavLink to="/members/set-log" className="members-floating-link">
          SetLog
        </NavLink>
        <NavLink to="/members/song-meeting" className="members-floating-link">
          선곡회의
        </NavLink>
        <NavLink to="/members/games" className="members-floating-link">
          미니게임
        </NavLink>
      </nav>
    </div>
  );
}

export default MembersLayout;