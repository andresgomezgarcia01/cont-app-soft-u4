import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';
import ApiErrorMessage from '../components/common/ApiErrorMessage';
import { getVolcanoById } from '../services/volcanoService';

function VolcanoDetail() {
  const { id } = useParams();

  const [result, setResult] = useState({
    id: null,
    volcano: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    getVolcanoById(id)
      .then((volcano) => {
        if (active) {
          setResult({
            id,
            volcano,
            loading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (active) {
          setResult({
            id,
            volcano: null,
            loading: false,
            error: err,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isCurrentResult = result.id === id;
  const loading = !isCurrentResult || result.loading;
  const error = isCurrentResult ? result.error : null;
  const volcano = isCurrentResult ? result.volcano : null;

  return (
    <MainLayout>
      <main className="volcano-explorer">
        <Link className="volcano-list__detail-link" to="/volcanes">
          ← Volver a explorar volcanes
        </Link>

        {loading ? (
          <div className="volcano-list__message">
            Cargando información del volcán...
          </div>
        ) : error ? (
          <ApiErrorMessage
            error={error}
            prefix="No fue posible consultar el volcán:"
            className="volcano-list__message volcano-list__message--error"
          />
        ) : !volcano ? (
          <div className="volcano-list__message">
            No se encontró el volcán solicitado.
          </div>
        ) : (
          <section className="volcano-list" style={{ marginTop: 24 }}>
            <p className="dashboard__eyebrow">VOLCANO EXPLORER</p>
            <h1>{volcano.name}</h1>
            <p>Identificador: {volcano.id}</p>

            <div className="volcano-detail__grid">
              <p><strong>País:</strong> {volcano.country}</p>
              <p><strong>Región:</strong> {volcano.region}</p>
              <p><strong>Tipo:</strong> {volcano.type}</p>
              <p>
                <strong>Elevación:</strong>{' '}
                {volcano.elevation != null
                  ? `${volcano.elevation.toLocaleString('es-CO')} m`
                  : '—'}
              </p>
              <p><strong>Latitud:</strong> {volcano.latitude ?? '—'}</p>
              <p><strong>Longitud:</strong> {volcano.longitude ?? '—'}</p>
              <p>
                <strong>Última erupción:</strong>{' '}
                {volcano.lastEruptionYear || '—'}
              </p>
              <p>
                <strong>Configuración tectónica:</strong>{' '}
                {volcano.tectonicSetting}
              </p>
              <p>
                <strong>Categoría de evidencia:</strong>{' '}
                {volcano.evidenceCategory}
              </p>
              <p><strong>Tipo de roca:</strong> {volcano.rockType}</p>
            </div>
          </section>
        )}
      </main>
    </MainLayout>
  );
}

export default VolcanoDetail;
