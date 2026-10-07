import type { JSX } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound(): JSX.Element {
    return (
        <section className="not-found" aria-labelledby="not-found-title">
            <p className="not-found-code">404</p>

            <h1 id="not-found-title" className="not-found-title">
                페이지를 찾을 수 없습니다
            </h1>

            <p className="not-found-desc">
                주소가 올바른지 확인하거나 아래 링크로 이동해주세요.
            </p>

            <div className="not-found-actions">
                <Link
                    to="/"
                    className="not-found-link not-found-link-primary"
                >
                    홈으로
                </Link>
            </div>
        </section>
    );
}

export default NotFound;