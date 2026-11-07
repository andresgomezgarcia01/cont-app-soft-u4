import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';
import ApiErrorMessage from '../components/common/ApiErrorMessage';
import Filters from '../components/dashboard/Filters';
import { useVolcanoes } from '../hooks/useVolcanoes';
import { getFilterOptions } from '../services/volcanoService';

const PAGE_SIZE = 20;

function VolcanoExplorer() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    types: [],
  });

  const [optionsError, setOptionsError] = useState(null);

  const { volcanoes, total, loading, error } = useVolcanoes({
    search,
    country,
    type,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    let active = true;

    getFilterOptions()
      .then((options) => {
        if (active) {
          setFilterOptions(options);
        }
      })
      .catch((err) => {
        if (active) {
          setOptionsError(err);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCountryChange = (value) => {
    setCountry(value);
    setPage(1);
  };

  const handleTypeChange = (value) => {
    setType(value);
    setPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setCountry('');
    setType('');
    setPage(1);
  };

  return (
    <MainLayout>
      <main className="volcano-explorer">
        <header className="volcano-explorer__header">
          <p className="dashboard__eyebrow">VOLCANO EXPLORER</p>
          <h1>Explorar volcanes</h1>
          <p>
            Consulta y descubre información de los volcanes registrados
            en nuestra base de datos.
          </p>
        </header>

        <Filters
          search={search}
          country={country}
          type={type}
          countries={filterOptions.countries}
          types={filterOptions.types}
          onSearchChange={handleSearchChange}
          onCountryChange={handleCountryChange}
          onTypeChange={handleTypeChange}
          onClear={handleClear}
        />

        {optionsError && (
          <ApiErrorMessage
            error={optionsError}
            prefix="No fue posible cargar algunas opciones de filtro:"
            className="volcano-explorer__notice"
          />
        )}

        <section className="volcano-list">
          <div className="volcano-list__header">
            <div>
              <h2>Resultados</h2>
              <p>
                {loading
                  ? 'Consultando volcanes...'
                  : `${total.toLocaleString('es-CO')} volcanes encontrados`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="volcano-list__message">
              Cargando volcanes...
            </div>
          ) : error ? (
            <ApiErrorMessage
              error={error}
              prefix="No fue posible cargar los volcanes:"
              className="volcano-list__message volcano-list__message--error"
            />
          ) : volcanoes.length === 0 ? (
            <div className="volcano-list__message">
              No se encontraron volcanes con los criterios seleccionados.
            </div>
          ) : (
            <>
              <div className="volcano-list__table-wrapper">
                <table className="volcano-list__table">
                  <thead>
                    <tr>
                      <th>Identificador</th>
                      <th>Nombre</th>
                      <th>País</th>
                      <th>Tipo</th>
                      <th>Elevación</th>
                      <th>Última erupción</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>

                  <tbody>
                    {volcanoes.map((volcano) => (
                      <tr key={volcano.id}>
                        <td>{volcano.id}</td>
                        <td className="volcano-list__name">
                          {volcano.name}
                        </td>
                        <td>{volcano.country}</td>
                        <td>{volcano.type}</td>
                        <td>
                          {volcano.elevation !== null
                            ? `${volcano.elevation.toLocaleString('es-CO')} m`
                            : '—'}
                        </td>
                        <td>{volcano.lastEruptionYear || '—'}</td>
                        <td>
                          <Link
                            className="volcano-list__detail-link"
                            to={`/volcanes/${encodeURIComponent(volcano.id)}`}
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="volcano-list__pagination">
                <span>
                  Página {page} de {totalPages}
                </span>

                <div>
                  <button
                    type="button"
                    onClick={() => setPage((current) => current - 1)}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </MainLayout>
  );
}

export default VolcanoExplorer;
