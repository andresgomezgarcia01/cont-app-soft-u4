
import { useEffect, useState } from 'react';

import {
  MapContainer,
  TileLayer,
  useMap,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { getAllVolcanoesForMap } from '../../services/volcanoService';

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function VolcanoMarkers({ volcanoes }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60,
    });

    volcanoes.forEach((volcano) => {
      const marker = L.marker([
        volcano.latitude,
        volcano.longitude,
      ]);

      // Creamos el contenido del popup de forma segura.
      const popupContent = document.createElement('div');

      const name = document.createElement('strong');
      name.textContent = volcano.name;

      const country = document.createElement('p');
      country.textContent = `País: ${volcano.country}`;

      const elevation = document.createElement('p');
      elevation.textContent =
        `Elevación: ${volcano.elevation ?? 'No disponible'} m`;

      popupContent.append(name, country, elevation);

      marker.bindPopup(popupContent);

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, volcanoes]);

  return null;
}

function VolcanoMap() {
  const [volcanoes, setVolcanoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadVolcanoes = async () => {
      try {
        const data = await getAllVolcanoesForMap();

        if (active) {
          setVolcanoes(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadVolcanoes();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="volcano-map">
      <div className="volcano-map__header">
        <h2>Mapa mundial de volcanes</h2>
        <p>
          Explora la distribución geográfica de los volcanes
          registrados en nuestra base de datos.
        </p>
      </div>

      {loading && <p>Cargando volcanes...</p>}

      {error && (
        <p>No fue posible cargar los volcanes: {error}</p>
      )}

      <div className="volcano-map__container">
        <MapContainer
          center={[15, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="volcano-map__leaflet"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapResizeHandler />

          <VolcanoMarkers volcanoes={volcanoes} />
        </MapContainer>
      </div>

      <p className="volcano-map__count">
        {volcanoes.length.toLocaleString('es-CO')} volcanes disponibles
      </p>
    </section>
  );
}

export default VolcanoMap;
