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
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError('');
    setPost(null);

    if (!id) {
      setLoadError('게시글 주소가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    fetchPostById(id)
      .then((found) => {
        if (cancelled) return;

        if (!found) {
          setLoadError('게시글을 불러올 수 없습니다.');
          return;
        }

        setPost(found);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            '게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
  
    const password = sessionStorage.getItem('sonamu_blog_password');
 
    if (!password) {
      alert('인증 정보가 없습니다. 글쓰기 메뉴를 통해 먼저 인증해주세요.');
      return;
    }

    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setDeleting(true);

    try {
      const result = await deletePost(id, password);

      if (!result.success) {
        alert(result.message || '삭제에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      navigate('/blog', { replace: true });
    } catch {
      alert(
        '삭제 결과를 확인하지 못했습니다. ' +
        '목록에서 해당 글이 남아 있는지 확인해주세요.'
      );
    } finally {
      setDeleting(false);
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
          <button onClick={handleDelete} className="blog-action-link blog-delete" disabled={deleting}>{deleting ? '삭제 중...' : '삭제'}</button>
          <Link to="/blog" className="blog-action-link">목록으로</Link>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;