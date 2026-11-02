import { NavLink, Outlet } from 'react-router-dom';
import { NAV_ITEMS } from '../router.jsx';

export default function RootLayout() {
  return (
    <>
      <nav className="navbar navbar-expand-md navbar-citrus sticky-top">
        <div className="container">
          <NavLink to="/" className="navbar-brand brand">🍊 감귤 수확철 비서</NavLink>
          <ul className="nav gap-1 flex-nowrap overflow-auto">
            {NAV_ITEMS.map((n) => (
              <li className="nav-item" key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className="nav-link text-nowrap">
                  <i className={`bi bi-${n.icon} me-1`} />{n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
      <footer className="container pb-4 notice">
        제주대 청년도약 부트캠프 개인 프로젝트 · 점수와 시세는 참고용이며 실제 거래 전 직접 확인하세요. · 사진 출처: <a href="https://pixabay.com" target="_blank" rel="noreferrer noopener">Pixabay</a> (Pixabay Content License)
      </footer>
    </>
  );
}
