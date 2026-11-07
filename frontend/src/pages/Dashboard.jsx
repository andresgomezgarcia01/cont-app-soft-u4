import StatCard from '../components/dashboard/StatCard';
import { useStatistics } from '../hooks/useStatistics';
import MainLayout from '../components/layout/MainLayout';
import VolcanoCharts from '../components/dashboard/VolcanoCharts';
import VolcanoMap from '../components/dashboard/VolcanoMap';

function Dashboard() {
  const { statistics, loading, error } = useStatistics();

  return (
    <MainLayout>
      <main className="dashboard">
        <header className="dashboard__header">
          <div>
            <p className="dashboard__eyebrow">VOLCANO EXPLORER</p>
            <h1>Explora los volcanes del mundo</h1>
            <p>
              Descubre volcanes, información geológica y su distribución
              mundial.
            </p>
          </div>
        </header>

        <section className="dashboard__stats">
          <StatCard
            title="Total de volcanes"
            value={
              loading
                ? '...'
                : statistics?.totalVolcanoes?.toLocaleString('es-CO') ?? '—'
            }
            description="Volcanes registrados en el conjunto de datos"
            icon="🌋"
          />

          <StatCard
            title="Países"
            value={loading ? '...' : statistics?.totalCountries ?? '—'}
            description="Países representados"
            icon="🌎"
          />

          <StatCard
            title="Regiones volcánicas"
            value={loading ? '...' : statistics?.totalRegions ?? '—'}
            description="Regiones representadas"
            icon="📍"
          />

          <StatCard
            title="Elevación promedio"
            value={
              loading
                ? '...'
                : statistics?.averageElevation != null
                  ? `${statistics.averageElevation.toLocaleString('es-CO')} m`
                  : '—'
            }
            description="Elevación promedio registrada"
            icon="⛰️"
          />
        </section>

        {error ? (
          <p role="alert">
            No fue posible cargar las estadísticas: {error}
          </p>
        ) : null}

        <VolcanoCharts
          statistics={statistics}
          loading={loading}
          error={error}
        />

        <VolcanoMap />
      </main>
    </MainLayout>
  );
}

export default Dashboard;