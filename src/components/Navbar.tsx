import type { JSX } from 'react/jsx-runtime';
import logo from "../assets/sonamu_logo.png";
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar(): JSX.Element {
    return (
        <nav className='navbar'>
            <Link to="/" className='navbar-logo'>
                <img src={logo} alt="Sonamu" className='logo-img' />
            </Link>
            <ul className='navbar-menu'>
                <li><Link to="/">HOME</Link></li>
                <li><Link to="/about">ABOUT</Link></li>
                <li><Link to="/details">DETAILS</Link></li>
                <li><Link to="/blog">BLOG</Link></li>
                <li><Link to="/contact">CONTACT</Link></li>
            </ul>
        </nav>
    );
}

export default Navbar;