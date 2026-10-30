import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  checkMemberSession,
  loginMember,
} from '../api/memberAuth';

import './Members.css';

type GateState = 'checking' | 'locked' | 'unlocked' | 'error';

type MembersGateProps = {
  children: ReactNode;
};

function MembersGate({ children }: MembersGateProps) {
  const [gateState, setGateState] = useState<GateState>('checking');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    checkMemberSession()
      .then((authenticated) => {
        if (active) {
          setGateState(authenticated ? 'unlocked' : 'locked');
        }
      })
      .catch(() => {
        if (active) {
          setGateState('error');
        }
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      await loginMember(password);
      setPassword('');
      setGateState('unlocked');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '로그인에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (gateState === 'checking') {
    return (
      <main className="members-gate-page">
        <p role="status">부원 인증 상태를 확인하고 있습니다...</p>
      </main>
    );
  }

  if (gateState === 'error') {
    return (
      <main className="members-gate-page">
        <section className="members-gate-card">
          <p role="alert">인증 서버에 연결할 수 없습니다.</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            다시 시도
          </button>
        </section>
      </main>
    );
  }

  if (gateState === 'unlocked') {
    return <>{children}</>;
  }

  return (
    <main className="members-gate-page">
      <section className="members-gate-card">
        <h1>소나무 부원 인증</h1>
        <p>부원 공용 비밀번호를 입력해주세요.</p>

        <form className="members-gate-form" onSubmit={handleSubmit}>
          <label htmlFor="members-password">비밀번호</label>
          <input
            id="members-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {errorMessage && (
            <p className="members-gate-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? '확인 중...' : '인증하기'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default MembersGate;