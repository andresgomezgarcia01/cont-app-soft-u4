import { NavLink } from 'react-router-dom';

function Sidebar() {
  const getLinkClass = ({ isActive }) =>
    `sidebar__link${isActive ? ' sidebar__link--active' : ''}`;

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <NavLink to="/" end className={getLinkClass}>
          <span>📊</span>
          Panel principal
        </NavLink>

        <NavLink to="/volcanes" className={getLinkClass}>
          <span>🌋</span>
          Explorar volcanes
        </NavLink>

        <NavLink to="/guia" className={getLinkClass}>
          <span>📖</span>
          Guía de uso
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
