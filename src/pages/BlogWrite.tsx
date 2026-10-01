import type { JSX } from 'react/jsx-runtime';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  useEffect(() => {
    if (!isEdit || !id) return;
    fetchPostById(id).then((found) => {
      if (found) {
        setAuthor(found.author);
        setTitle(found.title);
        setContent(found.content);
      }
      setLoading(false);
    });
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const password = sessionStorage.getItem('sonamu_blog_password') || '';
    setSubmitting(true);

    const result = isEdit
      ? await updatePost({ id: String(id), author, title, content, password })
      : await createPost({ author, title, content, password });

    setSubmitting(false);

    if (result.success) {
      navigate(isEdit ? `/blog/${id}` : '/blog');
    } else {
      alert(result.message || '저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (loading) return <p className="blog-empty">불러오는 중...</p>;

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