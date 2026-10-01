// src/pages/About.tsx
import type { JSX } from 'react/jsx-runtime';
import { useState } from 'react';
import Reveal from '../components/Reveal';
import './Details.css';

type TeamView = 'taste' | 'generation';

const performances = [
  '사회대 새내기배움터',
  '새내기대학',
  '여름 정기공연',
  '겨울 정기공연',
  '홈커밍 공연',
  '서울대학교 축제 등'
];

const recruitPositions = [
  { label: "보컬 (남)", count: 1, max: 10},
  { label: "보컬 (여)", count: 1, max: 10},
  { label: "일렉기타", count: 3, max: 10},
  { label: "드럼", count: 2, max: 10},
  { label: "베이스", count: 2, max: 10},
  { label: "건반", count: 1, max: 10},
];


function Details(): JSX.Element {
  const [teamView, setTeamView] = useState<TeamView>('taste');

  return (
    <div className='details'>
      <section className='details-hero'>
        <Reveal>
          <p className='details-eyebrow'>DETAILS</p>
          <h1 className='details-title'>소나무를 자세히 알아보세요</h1>
        </Reveal>
      </section>

      <section className='details-stats'>
        <Reveal delay={0} className='stat-item'>
          <h3>20명</h3>
          <p>총원</p>
        </Reveal>
        <Reveal delay={120} className='stat-item'>
          <h3>4개</h3>
          <p>팀 구성</p>
        </Reveal>
        <Reveal delay={240} className='stat-item'>
          <h3>1회</h3>
          <p>연 1회 리크루팅</p>
        </Reveal>
      </section>

      <section className='details-section'>
        <Reveal>
          <span className='details-label'>PERFORMANCES</span>
          <h2 className='details-heading'>함께하는 무대</h2>
        </Reveal>
        <div className='performance-grid'>
          {performances.map((item, i) => (
            <Reveal key={item} delay={i * 80} className='performance-card'>
              <span className='performance-num'>{String(i+1).padStart(2, '0')}</span>
              <span className='performance-name'>{item}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className='details-section'>
        <Reveal>
          <span className='details-label'>TEAM</span>
          <h2 className='details-heading'>팀 구성</h2>
          <p className='details-desx'>
            10명씩 A팀 · B팀으로 나뉘며, 면접 후 세션의 취향에 맞추어 배정됩니다.
            동시에 선배 기수 10명 · 신입 기수 10명으로도 나뉘며 결과적으로 총 4개 팀이 구성됩니다.
          </p>
        </Reveal>

        <Reveal className='team-tabs'>
          <button
            className={`team-tab ${teamView === 'taste' ? 'active' : ''}`}
            onClick={() => setTeamView('taste')}
          >
            장르별 보기
          </button>
          <button
            className={`team-tab ${teamView === 'generation' ? 'active' : ''}`}
            onClick={() => setTeamView('generation')}
          >
            기수별 보기
          </button>
        </Reveal>

        {teamView === 'taste' ? (
          <div className='team-grid'>
            <div className='team-card'>
              <h3>A팀</h3>
              <p>부드러운 인디 성향</p>
              <span className='team-count'>10명</span>
            </div>
            <div className='team-card'>
              <h3>B팀</h3>
              <p>비교적 강한 성향</p>
              <span className='team-count'>10명</span>
            </div>
          </div>
        ) : (
          <div className='team-grid'>
            <div className='team-card'>
              <h3>선배 기수</h3>
              <p>기존 부원으로 구성된 팀</p>
              <span className='team-count'>10명</span>
            </div>
            <div className='team-card'>
              <h3>신입 기수</h3>
              <p>이번 기수 신입 부원으로 구성된 팀</p>
              <span className='team-count'>10명</span>
            </div>
          </div>
        )}
      </section>

      <section className='details-section'>
        <Reveal>
          <span className='details-label'>RECRUTING</span>
          <h2 className='details-heading'>모집 인원</h2>
          <p className='details-desc'>
            매년 1학기 초, 대면 면접을 통해 총 10명을 리크루팅합니다.
          </p>
        </Reveal>
        <div className='recruit-list'>
          {recruitPositions.map((pos, i) => (
            <Reveal key={pos.label} delay={i * 60} className='recruit-row'>
              <span className='recruit-label'>{pos.label}</span>
              <div className='recruit-bar-track'>
                <div
                  className='recruit-bar-fill'
                  style={{width: `${(pos.count / pos.max) * 100}%`}}
                />
              </div>
              <span className='recruit-count'>{pos.count}명</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className='details-location'>
        <Reveal>
          <span className='details-label'>LOCATION</span>
          <h2 className='details-heading'>동아리방</h2>
          <p className='dtails-desc'>
            사회대 신양학술정보관 3층에 위치해 있습니다.
          </p>
        </Reveal>
      </section>
    </div>
  );
}

export default Details;