import { type JSX } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Details from './pages/Details';
import Blog from './pages/Blog';
import BlogWrite from './pages/BlogWrite';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';
import './App.css';

function App(): JSX.Element {
  return (
    <>
      <Navbar />
      <main className='page-content'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/details" element={<Details />} />
          <Route path="/blog" element={<Blog />} />
          <Route path='/blog/write' element={<BlogWrite />} />
          <Route path='/blog/:id' element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
