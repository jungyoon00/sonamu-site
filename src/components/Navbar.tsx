import type { JSX } from 'react/jsx-runtime';
import logo from "../assets/sonamu_logo.png";
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

function Navbar(): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const closeMenu = () => setIsOpen(false);

    // menu overflow
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // close side menu in transition (mobile to desktop)
    useEffect(() => {
        const desktopQuery = window.matchMedia('(min-width: 769px)');

        const closeOnDesktop = () => {
            if (desktopQuery.matches) {
                setIsOpen(false);
            }
        };

        desktopQuery.addEventListener('change', closeOnDesktop);

        return () => {
            desktopQuery.removeEventListener('change', closeOnDesktop);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const toggle = toggleRef.current;
        const menu = mobileMenuRef.current;

        if (!toggle || !menu) return;

        const links = Array.from(
            menu.querySelectorAll<HTMLAnchorElement>('a[href]')
        );

        const focusableElements: HTMLElement[] = [toggle, ...links];
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // move focus to first link
        (links[0] ?? toggle).focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                toggle.focus();
                return;
            }

            if (event.key !== 'Tab') return;

            const activeElement = document.activeElement;
            const focusIsInside = focusableElements.some(
                (element) => element === activeElement
            );

            // return focus
            if (!focusIsInside) {
                event.preventDefault();
                (event.shiftKey ? lastElement : firstElement).focus();
                return;
            }

            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <nav className='navbar'>
            <Link to="/" className='navbar-logo' onClick={closeMenu}>
                <img src={logo} alt="Sonamu" className='logo-img' />
            </Link>

            {/* desktop menu */}
            <ul className='navbar-menu'>
                <li><Link to="/">HOME</Link></li>
                <li><Link to="/about">ABOUT</Link></li>
                <li><Link to="/details">DETAILS</Link></li>
                <li><Link to="/members">MEMBERS</Link></li>
                <li><Link to="/contact">CONTACT</Link></li>
            </ul>

            {/* burger menu (only mobile) */}
            <button
              ref={toggleRef}
              type='button'
              className={`navbar-toggle ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isOpen}
              aria-controls='navbar-mobile-menu'
            >
                <span />
                <span />
                <span />
            </button>

            {/* mobile menu */}
            <div
                ref={mobileMenuRef}
                id="navbar-mobile-menu"
                className={`navbar-mobile-menu ${isOpen ? 'open' : ''}`}
                inert={!isOpen}
            >
                <ul>
                    <li><Link to="/" onClick={closeMenu}>HOME</Link></li>
                    <li><Link to="/about" onClick={closeMenu}>ABOUT</Link></li>
                    <li><Link to="/details" onClick={closeMenu}>DETAILS</Link></li>
                    <li><Link to="/members" onClick={closeMenu}>MEMBERS</Link></li>
                    <li><Link to="/contact" onClick={closeMenu}>CONTACT</Link></li>
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;