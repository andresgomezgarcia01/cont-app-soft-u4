function Filters({
  search,
  country,
  type,
  countries,
  types,
  onSearchChange,
  onCountryChange,
  onTypeChange,
  onClear,
}) {
  const hasFilters = search || country || type;

  return (
    <section className="volcano-filters">
      <div className="volcano-filters__header">
        <div>
          <h2>Buscar y filtrar</h2>
          <p>Encuentra volcanes por nombre, identificador, país o tipo.</p>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="volcano-filters__clear"
            onClick={onClear}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="volcano-filters__controls">
        <label className="volcano-filters__field volcano-filters__field--search">
          <span>Buscar volcán</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre o identificador..."
          />
        </label>

        <label className="volcano-filters__field">
          <span>País</span>
          <select
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
          >
            <option value="">Todos los países</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="volcano-filters__field">
          <span>Tipo de volcán</span>
          <select
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            <option value="">Todos los tipos</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export default Filters;
