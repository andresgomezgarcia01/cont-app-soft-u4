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

  useEffect(() => {
    const handleAuthRequired = () => {
      setApiKey(null);
    };

    window.addEventListener('api-auth-required', handleAuthRequired);

    return () => {
      window.removeEventListener('api-auth-required', handleAuthRequired);
    };
  }, []);

  const handleAuthenticated = () => {
    setApiKey(getStoredApiKey());
  };

  if (!apiKey) {
    return <ApiKeyGate onAuthenticated={handleAuthenticated} />;
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
