import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

function Guide() {
  return (
    <MainLayout>
      <main className="guide-page">
        <header className="volcano-explorer__header">
          <p className="dashboard__eyebrow">VOLCANO EXPLORER</p>
          <h1>Guía de uso</h1>
          <p>
            Conoce las funcionalidades de Volcano Explorer y aprende
            a consultar la información de los volcanes registrados.
          </p>
        </header>

        <section className="guide__intro">
          <span className="guide__icon">🌋</span>
          <div>
            <h2>Bienvenido a Volcano Explorer</h2>
            <p>
              Esta aplicación permite explorar información de volcanes
              mediante estadísticas, gráficos, mapas y herramientas
              de búsqueda y consulta detallada.
            </p>
          </div>
        </section>

        <section className="guide__section" id="dashboard">
          <div className="guide__section-header">
            <span className="guide__number">01</span>
            <div>
              <h2>Panel principal</h2>
              <p>Una visión general de los volcanes registrados.</p>
            </div>
          </div>

          <div className="guide__cards">
            <article className="guide__card">
              <span>📊</span>
              <h3>Estadísticas generales</h3>
              <p>
                Consulta indicadores como el total de volcanes,
                países y regiones representadas, además de la
                elevación promedio registrada.
              </p>
            </article>

            <article className="guide__card">
              <span>📈</span>
              <h3>Gráficos</h3>
              <p>
                Explora representaciones gráficas que permiten
                visualizar y analizar la distribución de los
                registros según las categorías disponibles.
              </p>
            </article>

            <article className="guide__card">
              <span>🗺️</span>
              <h3>Mapa interactivo</h3>
              <p>
                Visualiza la distribución geográfica de los volcanes
                utilizando sus coordenadas registradas.
              </p>
            </article>
          </div>

          <Link className="guide__link" to="/">
            Ir al panel principal →
          </Link>
        </section>

        <section className="guide__section" id="explorer">
          <div className="guide__section-header">
            <span className="guide__number">02</span>
            <div>
              <h2>Explorar volcanes</h2>
              <p>Encuentra registros utilizando las herramientas de consulta.</p>
            </div>
          </div>

          <div className="guide__steps">
            <article>
              <span className="guide__step-icon">🔎</span>
              <div>
                <h3>Búsqueda por nombre</h3>
                <p>
                  Escribe el nombre de un volcán en el campo de búsqueda
                  para localizar coincidencias.
                </p>
              </div>
            </article>

            <article>
              <span className="guide__step-icon">🌎</span>
              <div>
                <h3>Filtro por país</h3>
                <p>
                  Selecciona un país para consultar los volcanes
                  asociados a esa ubicación.
                </p>
              </div>
            </article>

            <article>
              <span className="guide__step-icon">🌋</span>
              <div>
                <h3>Filtro por tipo</h3>
                <p>
                  Selecciona una categoría de tipo de volcán para
                  reducir los resultados.
                </p>
              </div>
            </article>

            <article>
              <span className="guide__step-icon">↻</span>
              <div>
                <h3>Limpiar filtros</h3>
                <p>
                  Utiliza la opción de limpiar para restablecer
                  los criterios de búsqueda.
                </p>
              </div>
            </article>

            <article>
              <span className="guide__step-icon">📄</span>
              <div>
                <h3>Paginación</h3>
                <p>
                  Navega entre las páginas de resultados utilizando
                  los controles anterior y siguiente.
                </p>
              </div>
            </article>
          </div>

          <Link className="guide__link" to="/volcanes">
            Explorar volcanes →
          </Link>
        </section>

        <section className="guide__section" id="detail">
          <div className="guide__section-header">
            <span className="guide__number">03</span>
            <div>
              <h2>Detalle de cada volcán</h2>
              <p>Consulta la información individual de cada registro.</p>
            </div>
          </div>

          <p className="guide__description">
            Desde el explorador puedes seleccionar la opción
            «Ver detalle» para acceder a la ficha individual de un volcán.
            Allí encontrarás información como:
          </p>

          <div className="guide__data-grid">
            <div><strong>Identificación</strong><span>Nombre e identificador</span></div>
            <div><strong>Ubicación</strong><span>País y región</span></div>
            <div><strong>Geografía</strong><span>Latitud, longitud y elevación</span></div>
            <div><strong>Actividad</strong><span>Año de última erupción registrado</span></div>
            <div><strong>Geología</strong><span>Tipo de volcán y tipo de roca</span></div>
            <div><strong>Tectónica</strong><span>Configuración tectónica</span></div>
            <div><strong>Evidencia</strong><span>Categoría de evidencia</span></div>
          </div>

          <Link className="guide__link" to="/volcanes">
            Buscar un volcán →
          </Link>
        </section>

        <section className="guide__section" id="data">
          <div className="guide__section-header">
            <span className="guide__number">04</span>
            <div>
              <h2>Información de los datos</h2>
              <p>Cómo se organiza la información consultada.</p>
            </div>
          </div>

          <p className="guide__description">
            Volcano Explorer presenta información estructurada de
            volcanes almacenada en una base de datos. Los registros
            contienen atributos de identificación, ubicación,
            características geológicas y actividad volcánica.
          </p>

          <div className="guide__notice">
            <strong>Fuente de datos</strong>
            <p>
              La información del catálogo proviene del Global Volcanism
              Program del Smithsonian Institution, que recopila y
              documenta información sobre volcanes del mundo.
            </p>
            <a
              href="https://volcano.si.edu"
              target="_blank"
              rel="noopener noreferrer"
            >
              Global Volcanism Program - Smithsonian Institution
            </a>
          </div>

          <div className="guide__notice">
            <strong>Consulta de información</strong>
            <p>
              La aplicación obtiene los registros mediante una API
              y permite consultar los resultados de forma paginada.
              La disponibilidad de cada atributo depende de la
              información registrada para cada volcán.
            </p>
          </div>
        </section>

        <footer className="guide__footer">
          <h2>¿Listo para explorar?</h2>
          <p>
            Comienza consultando las estadísticas generales o busca
            un volcán específico en el explorador.
          </p>
          <div className="guide__actions">
            <Link to="/" className="guide__button guide__button--primary">
              Ir al panel principal
            </Link>
            <Link to="/volcanes" className="guide__button">
              Explorar volcanes
            </Link>
          </div>
        </footer>
      </main>
    </MainLayout>
  );
}

export default Guide;
