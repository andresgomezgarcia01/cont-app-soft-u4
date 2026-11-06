function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <a href="/" className="sidebar__link sidebar__link--active">
          <span>📊</span>
          Panel principal
        </a>

        <a href="#" className="sidebar__link">
          <span>🌋</span>
          Explorar volcanes
        </a>

        <a href="#" className="sidebar__link">
          <span>ℹ️</span>
          Acerca del proyecto
        </a>
      </nav>
    </aside>
  );
}

export default Sidebar;