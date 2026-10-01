import type { JSX } from 'react/jsx-runtime';
import { useState, type FormEvent, type ReactNode } from 'react';
import { verifyPassword } from '../api/blog';
import './PasswordGate.css';

interface PasswordGateProps {
  children: ReactNode;
}

function PasswordGate({ children }: PasswordGateProps): JSX.Element {
  const [authorized, setAuthorized] = useState<boolean>(
    sessionStorage.getItem('sonamu_blog_auth') === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await verifyPassword(password);
    setLoading(false);

    if (ok) {
      sessionStorage.setItem('sonamu_blog_auth', 'true');
      sessionStorage.setItem('sonamu_blog_password', password);
      setAuthorized(true);
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  if (authorized) return <>{children}</>;

  return (
    <div className="password-gate">
      <p className="gate-label">MEMBER ONLY</p>
      <h2 className="gate-title">부원 인증이 필요합니다</h2>
      <form className="gate-form" onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          className="gate-input"
        />
        <button type="submit" className="gate-submit" disabled={loading}>
          {loading ? '확인 중...' : '확인'}
        </button>
      </form>
      {error && <p className="gate-error">{error}</p>}
    </div>
  );
}

export default PasswordGate;