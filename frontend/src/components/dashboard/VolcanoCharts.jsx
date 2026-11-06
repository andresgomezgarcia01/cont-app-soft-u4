
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

function VolcanoCharts({ statistics }) {
  // Preparamos los datos de volcanes por país.
  // Mostramos únicamente los 10 países con más volcanes.
  const countries = statistics?.countries?.slice(0, 10) || [];

  const countryData = {
    labels: countries.map((country) => country.name),
    datasets: [
      {
        label: 'Cantidad de volcanes',
        data: countries.map((country) => country.count),
        backgroundColor: '#d97745',
        borderRadius: 6,
      },
    ],
  };

  // Preparamos la distribución por tipo de volcán.
  const types = statistics?.types || [];

  const typeData = {
    labels: types.map((type) => type.name),
    datasets: [
      {
        label: 'Cantidad de volcanes',
        data: types.map((type) => type.count),
        backgroundColor: [
          '#d97745',
          '#e9a66b',
          '#526d82',
          '#7895a8',
          '#a9bdc8',
          '#8c9b78',
          '#c6a77d',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const countryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const typeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <section className="dashboard__charts">
      <article className="chart-card">
        <div className="chart-card__header">
          <h2>Volcanes por país</h2>
          <p>Los 10 países con mayor cantidad de volcanes</p>
        </div>

        <div className="chart-card__content chart-card__content--bar">
          {countries.length > 0 ? (
            <Bar data={countryData} options={countryOptions} />
          ) : (
            <p>No hay información disponible.</p>
          )}
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-card__header">
          <h2>Tipos de volcanes</h2>
          <p>Distribución según su clasificación</p>
        </div>

        <div className="chart-card__content chart-card__content--doughnut">
          {types.length > 0 ? (
            <Doughnut data={typeData} options={typeOptions} />
          ) : (
            <p>No hay información disponible.</p>
          )}
        </div>
      </article>
    </section>
  );
}

export default VolcanoCharts;
