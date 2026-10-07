import type { JSX } from 'react/jsx-runtime';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PasswordGate from '../components/PasswordGate.tsx';
import { createPost, updatePost, fetchPostById } from '../api/blog';
import './Blog.css';

function BlogWriteForm(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    
    setLoading(true);
    setLoadError('');

    fetchPostById(id)
      .then((found) => {
        if (cancelled) return;

        if (!found) {
          setLoadError('수정할 글을 불러올 수 없습니다.');
          return;
        }

        setAuthor(found.author);
        setTitle(found.title);
        setContent(found.content);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
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
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    const trimmedAuthor = author.trim();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedAuthor || !trimmedTitle || !trimmedContent) {
      alert('이름, 제목, 내용을 모두 입력해주세요. 공백만 입력할 수 없습니다.');
      return;
    }

    const password = sessionStorage.getItem('sonamu_blog_password') || '';
    setSubmitting(true);

    try {
      const result = isEdit
        ? await updatePost({ id: String(id), author: trimmedAuthor, title: trimmedTitle, content: trimmedContent, password })
        : await createPost({ author: trimmedAuthor, title: trimmedTitle, content: trimmedContent, password });

      if (!result.success) {
        alert(result.message || '저장에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      navigate(isEdit ? `/blog/${id}` : '/blog');
    } catch (error) {
      console.error('게시글 저장 중 오류가 발생했습니다:', error);
      alert(
        '저장 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. ' +
        '다시 저장하기 전에 목록에서 반영 여부를 확인해주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="blog-empty">불러오는 중...</p>;

  if (isEdit && loadError) {
    return (
      <div className='blog-write'>
        <p className='blog-empty' role='alert'>
          {loadError}
        </p>
        <Link to="/blog" className='blog-action-link'>
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="blog-write">
      <h1 className="blog-write-title">{isEdit ? '글 수정하기' : '새 글 쓰기'}</h1>
      <form className="blog-write-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="blog-input"
          required
        />
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="blog-input"
          required
        />
        <textarea
          placeholder="내용을 적어주세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="blog-textarea"
          rows={12}
          required
        />
        <button type="submit" className="blog-submit-btn" disabled={submitting}>
          {submitting ? '저장 중...' : isEdit ? '수정 완료' : '게시하기'}
        </button>
      </form>
    </div>
  );
}

function BlogWrite(): JSX.Element {
  return (
    <PasswordGate>
      <BlogWriteForm />
    </PasswordGate>
  );
}

export default BlogWrite;