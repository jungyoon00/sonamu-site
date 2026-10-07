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
  
    if (loading) return;

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ok = await verifyPassword(password);

      if (!ok) {
        setError('인증에 실패했습니다. 비밀번호와 연결 상태를 확인해주세요.');
        return;
      }

      sessionStorage.setItem('sonamu_blog_password', password);
      sessionStorage.setItem('sonamu_blog_auth', 'true');

      setAuthorized(true);
    } catch {
      setError('인증을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
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
      {error && <p className="gate-error" role='alert'>{error}</p>}
    </div>
  );
}

export default PasswordGate;