// src/pages/About.tsx
import type { JSX } from 'react/jsx-runtime';
import Reveal from '../components/Reveal';
import './Contact.css';

function Contact(): JSX.Element {
  return (
    <div className="contact-page">
      <section className="contact-page-hero">
        <Reveal>
          <p className="contact-page-eyebrow">CONTACT</p>
          <h1 className="contact-page-title">소나무에게 연락하기</h1>
          <p className="contact-page-desc">
            궁금한 점이나 하고 싶은 이야기가 있다면 편하게 연락 주세요.
          </p>
        </Reveal>
      </section>

      <section className="contact-channels">
        <Reveal delay={0} className="channel-card">
          <div className="channel-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
            </svg>
          </div>
          <h3>Instagram</h3>
          <p>공연 소식과 일상을 가장 빠르게 확인하세요.</p>
          <a
            href="https://www.instagram.com/snu.sonamu_"
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link"
          >
            바로가기 →
          </a>
        </Reveal>

        <Reveal delay={120} className="channel-card">
          <div className="channel-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="currentColor"/>
            </svg>
          </div>
          <h3>YouTube</h3>
          <p>지난 공연 영상을 다시 볼 수 있습니다.</p>
          <a
            href="https://www.youtube.com/channel/UC7lLQ3-ffpyvkDq0yJGBpqw"
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link"
          >
            바로가기 →
          </a>
        </Reveal>
      </section>

      <section className="contact-location">
        <Reveal>
          <span className="contact-location-label">LOCATION</span>
          <h2 className="contact-location-title">동아리방</h2>
          <p className="contact-location-desc">
            서울대학교 사회과학대학 신양학술정보관 3층
          </p>
        </Reveal>
      </section>
    </div>
  );
}

export default Contact;