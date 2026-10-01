import type { JSX } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { fetchPosts } from '../api/blog';
import type { BlogPost } from '../types/blog';
import './Blog.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function Blog(): JSX.Element {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPosts()
      .then((data) => {
        setPosts(data);
      })
      .catch((err) => {
        console.error('게시글을 불러오지 못했습니다:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="blog">
      <section className="blog-hero">
        <Reveal>
          <p className="blog-eyebrow">SONAMU DIARY</p>
          <h1 className="blog-title">소나무 이야기</h1>
          <p className="blog-desc">일상과 기록</p>
          <Link to="/blog/write" className="blog-write-btn">글쓰기</Link>
        </Reveal>
      </section>

      <section className="blog-list-section">
        {loading && <p className="blog-empty">불러오는 중...</p>}
        {!loading && error && (
          <p className="blog-empty">게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        )}
        {!loading && !error && posts.length === 0 && (
          <p className="blog-empty">아직 작성된 글이 없습니다.</p>
        )}
        {!loading && !error && posts.length > 0 && (
          <div className="blog-list">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={Math.min(i * 60, 300)}>
                <Link to={`/blog/${post.id}`} className="blog-card">
                  <div className="blog-card-meta">
                    <span>{post.author}</span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <h3 className="blog-card-title">{post.title}</h3>
                  <p className="blog-card-preview">
                    {post.content.length > 80 ? `${post.content.slice(0, 80)}...` : post.content}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Blog;