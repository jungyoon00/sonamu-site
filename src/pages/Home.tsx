// src/pages/Home.tsx
import type { JSX } from 'react/jsx-runtime';
import { Link } from 'react-router-dom';
import './Home.css';

function Home(): JSX.Element {
  return (
    <div className='home'>
      <section className='hero'>
        <p className="hero-eyebrow">SNU COLLEGE OF SOCIAL SCIENCES</p>
        <h1 className='hero-title'>
          서울대학교 사회대 밴드, 소나무
        </h1>
        <Link to="/about" className="hero-cta">더 알아보기</Link>
      </section>

      <section className='intro'>
        <span className='intro-label'>ABOUT US</span>
        <h2 className='intro-title'>소나무를 소개합니다.</h2>
        <p className='intro-desc'>
          다양한 전공이 모여 음악으로 소통합니다.
          매 학기 정기 공연을 준비하며, 함께 연습하고 성장합니다.
        </p>
      </section>

      <section className='highlight'>
        <div className='highlight-item'>
          <h3>01</h3>
          <p>정기 공연</p>
        </div>
        <div className='highlight-item'>
          <h3>02</h3>
          <p>합주 연습</p>
        </div>
        <div className='highlight-item'>
          <h3>03</h3>
          <p>부원 모집</p>
        </div>
      </section>

      <section className='home-contact'>
        <span className='contact-label'>CONTACT</span>
        <p className='contact-desc'>
          공연 소식과 부원 모집을 확인해보세요.
        </p>
        <div className='contact-socials'>
        <a
          href="https://www.instagram.com/snu.sonamu_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="social-link"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
          </svg>
        </a>
        <a
          href='https://www.youtube.com/channel/UC7lLQ3-ffpyvkDq0yJGBpqw'
          target="_blank"
          rel="noopener noreferrer"
          aria-label='YouTube'
          className='social-link'
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor"/>
          </svg>
        </a>
        </div>
      </section>
    </div>
  );
}

export default Home;