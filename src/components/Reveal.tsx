import type { JSX, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

function Reveal({children, className = '', delay = 0}: RevealProps): JSX.Element {
    const { ref, isVisible } = useReveal<HTMLDivElement>();

    return (
        <div
          ref={ref}
          className={`reveal ${isVisible ? 'reveal-visible' : ''} ${className}`}
          style={{ transitionDelay: `${delay}ms`}}
        >
            {children}
        </div>
    );
}

export default Reveal;