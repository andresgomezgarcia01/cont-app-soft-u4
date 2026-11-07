import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import VolcanoExplorer from './pages/VolcanoExplorer';
import VolcanoDetail from './pages/VolcanoDetail';
import Guide from './pages/Guide';
import ApiKeyGate from './components/common/ApiKeyGate';
import { getStoredApiKey } from './services/apiClient';

function App() {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [networkError, setNetworkError] = useState(false);
  const [showApiKeyGate, setShowApiKeyGate] = useState(false);

  useEffect(() => {
    const handleAuthRequired = () => {
      setApiKey(null);
      setNetworkError(false);
      setShowApiKeyGate(false);
    };

    const handleNetworkError = () => {
      setNetworkError(true);
    };

    window.addEventListener('api-auth-required', handleAuthRequired);
    window.addEventListener('api-network-error', handleNetworkError);

    return () => {
      window.removeEventListener('api-auth-required', handleAuthRequired);
      window.removeEventListener('api-network-error', handleNetworkError);
    };
  }, []);

  const handleAuthenticated = () => {
    setApiKey(getStoredApiKey());
    setNetworkError(false);
    setShowApiKeyGate(false);
  };

  if (!apiKey || showApiKeyGate) {
    return <ApiKeyGate onAuthenticated={handleAuthenticated} />;
  }

  if (networkError) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>No fue posible conectar con el servicio</h1>
        <p>Verifica tu conexión e inténtalo nuevamente.</p>
        <button type="button" onClick={() => {
          setNetworkError(false);
          setShowApiKeyGate(true);
        }}>
          Volver al ingreso
        </button>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/volcanes" element={<VolcanoExplorer />} />
        <Route path="/volcanes/:id" element={<VolcanoDetail />} />
        <Route path="/guia" element={<Guide />} />
        <Route path="/acerca" element={<Navigate to="/guia" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
