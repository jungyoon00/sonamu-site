// src/pages/About.tsx
import type { JSX } from 'react/jsx-runtime';
import Reveal from '../components/Reveal';
import './About.css';
import { useEffect, useState } from 'react';

interface HistoryItem {
  year: string | number;
  month: string | number;
  day: string | number;
  description: string;
}

function formatHistoryDate(item: HistoryItem): string {
  const year = String(item.year || '');
  const month = String(item.month || '');
  const day = String(item.day || '');

  if (month && day) {
    return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
  }
  if (month) {
    return `${year}.${month.padStart(2, '0')}`;
  }
  return year;
}

function toSortableNumber(item: HistoryItem): number {
  const y = Number(item.year) || 0;
  const m = Number(item.month) || 0;
  const d = Number(item.day) || 0;
  return y * 10000 + m * 100 + d;
}

function About(): JSX.Element {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(import.meta.env.VITE_HISTORY_API_URL)
    .then((res) => res.json())
    .then((data: HistoryItem[]) => {
      const sorted = [...data].sort(
        (a, b) => toSortableNumber(b) - toSortableNumber(a)
      );
      setHistoryList(sorted);
    })
    .catch((err) => {
      console.error('연혁 데이터를 불러오지 못했습니다:', err)
      setError(true);
    })
    .finally(() => setLoading(false));
  }, []);

  return (
    <div className='about'>
      <section className='about-hero'>
        <Reveal>
          <p className='about-eyebrow'>ABOUT SONAMU</p>
          <h1 className='about-title'>소나무를 소개합니다</h1>
        </Reveal>
      </section>

      <section className='about-story'>
        <Reveal className='about-story-text'>
          <h2>우리의 이야기</h2>
          <p>
            소나무는 서울대학교 사회과학대학 소속 밴드 동아리로,
            다양한 전공의 사람들이 모여 함께 음악으로 소통하고 
            있습니다. 매 학기 정기 공연과 새내기대학 공연으로 
            함께 연습하고 성장해왔습니다.
          </p>
        </Reveal>
      </section>

      <section className='about-values'>
        <Reveal className='value-item' delay={0}>
          <h3>음악</h3>
          <p>다양한 장르의 음악을 함께 연주합니다.</p>
        </Reveal>
        <Reveal className='value-item' delay={120}>
          <h3>사람</h3>
          <p>전공과 학번을 넘어 다양한 사람들이 어우러집니다.</p>
        </Reveal>
        <Reveal className='value-item' delay={240}>
          <h3>공연</h3>
          <p>매 학기 정기 공연으로 그동안의 노력을 선보입니다.</p>
        </Reveal>
      </section>

      <section className='about-history'>
        <Reveal>
          <h2 className='about-history-title'>연혁</h2>
        </Reveal>

        {loading && (
          <ul className='history-list'>
            {[1, 2, 3].map((i) => (
              <li key={i} className='history-row history-skeleton'>
                <span className='skeleton-bar skeleton-year' />
                <span className='skeleton-bar skeleton-desc' />
              </li>
            ))}
          </ul>
        )}

        {!loading && error && (
          <p className='history-status'>연혁을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        )}

        {!loading && !error && historyList.length === 0 && (
          <p className='history-status'>아직 등록된 연혁이 없습니다.</p>
        )}

        {!loading && !error && historyList.length > 0 && (
          <ul className='history-list'>
            {historyList.map((item, i) => (
              <Reveal key={`${item.year}-${item.month}-${item.day}-${i}`} delay={i * 100}>
                <li className='history-row'>
                  <span className='history-year'>{formatHistoryDate(item)}</span>
                  <span className='history-desc'>{item.description}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default About;