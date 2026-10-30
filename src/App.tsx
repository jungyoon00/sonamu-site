import { lazy, Suspense, type JSX } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useParams,
} from 'react-router-dom';
import Navbar from './components/Navbar';
import MembersGate from './components/MembersGate';
import MembersLayout from './components/MembersLayout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import './App.css';

const SetLogs = lazy(() => import('./pages/SetLogs'));

const About = lazy(() => import('./pages/About'));
const Details = lazy(() => import('./pages/Details'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogWrite = lazy(() => import('./pages/BlogWrite'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Contact = lazy(() => import('./pages/Contact'));

function App(): JSX.Element {
  return (
    <>
      <Navbar />
      <main className="page-content">
        <Suspense
          fallback={
            <p className="page-loading" role="status">
              페이지를 불러오는 중...
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/details" element={<Details />} />
            <Route path="/contact" element={<Contact />} />

            <Route
              path="/members"
              element={
                <MembersGate>
                  <MembersLayout />
                </MembersGate>
              }
            >
              <Route
                index
                element={<Navigate to="/members/blog" replace />}
              />
              <Route path="blog" element={<Blog />} />
              <Route path="blog/write" element={<BlogWrite />} />
              <Route path="blog/edit/:id" element={<BlogWrite />} />
              <Route path="blog/:id" element={<BlogPost />} />

              <Route
                path="set-log"
                element={<SetLogs />}
              />
              <Route
                path="song-meeting"
                element={<MemberTemporaryPage title="선곡회의" />}
              />
              <Route
                path="games"
                element={<MemberTemporaryPage title="미니게임" />}
              />
            </Route>

            <Route
              path="/blog"
              element={<Navigate to="/members/blog" replace />}
            />
            <Route
              path="/blog/write"
              element={<Navigate to="/members/blog/write" replace />}
            />
            <Route
              path="/blog/edit/:id"
              element={<LegacyBlogEditRedirect />}
            />
            <Route
              path="/blog/:id"
              element={<LegacyBlogPostRedirect />}
            />
            <Route
              path="/blog/*"
              element={<Navigate to="/members/blog" replace />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

function MemberTemporaryPage({ title }: { title: string }): JSX.Element {
  return (
    <section className="member-temporary-page">
      <h2>{title}</h2>
      <p>페이지를 준비하고 있습니다.</p>
    </section>
  );
}

function LegacyBlogEditRedirect(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  return (
    <Navigate
      to={id ? `/members/blog/edit/${id}` : '/members/blog'}
      replace
    />
  );
}

function LegacyBlogPostRedirect(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  return (
    <Navigate
      to={id ? `/members/blog/${id}` : '/members/blog'}
      replace
    />
  );
}

export default App;