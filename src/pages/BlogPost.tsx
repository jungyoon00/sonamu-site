import type { JSX } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPostById, deletePost } from '../api/blog';
import type { BlogPost as BlogPostType } from '../types/blog';
import './Blog.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function BlogPost(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchPostById(id)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const password = sessionStorage.getItem('sonamu_blog_password');
    if (!password) {
      alert('인증 정보가 없습니다. 글쓰기 메뉴를 통해 먼저 인증해주세요.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const res = await deletePost(id, password);
    if (res.success) {
      navigate('/blog');
    } else {
      alert(res.message || '삭제에 실패했습니다.');
    }
  };

  if (loading) return <p className="blog-empty">불러오는 중...</p>;
  if (!post) return <p className="blog-empty">글을 찾을 수 없습니다.</p>;

  return (
    <div className="blog-detail">
      <div className="blog-detail-inner">
        <p className="blog-detail-meta">{post.author} · {formatDate(post.created_at)}</p>
        <h1 className="blog-detail-title">{post.title}</h1>
        <p className="blog-detail-content">{post.content}</p>
        <div className="blog-detail-actions">
          <Link to={`/blog/edit/${post.id}`} className="blog-action-link">수정</Link>
          <button onClick={handleDelete} className="blog-action-link blog-delete">삭제</button>
          <Link to="/blog" className="blog-action-link">목록으로</Link>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;