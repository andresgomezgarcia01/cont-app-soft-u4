function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo">🌋</span>
        <span className="navbar__title">Volcano Explorer</span>
      </div>

      <div className="navbar__actions">
        <span className="navbar__tagline">
          Explorando la actividad volcánica de la Tierra
        </span>
      </div>
    </nav>
  );
}

export default Navbar;