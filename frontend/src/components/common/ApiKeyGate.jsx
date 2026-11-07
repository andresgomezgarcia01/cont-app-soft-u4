import { useState } from 'react';
import { ApiError, validateApiKey } from '../../services/apiClient';
import './ApiKeyGate.css';

function ApiKeyGate({ onAuthenticated }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!apiKey.trim()) {
      setError('Ingresa la API key para continuar.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await validateApiKey(apiKey);
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          'No fue posible conectar con el servicio. Verifica tu conexión e inténtalo nuevamente.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-card__icon" aria-hidden="true">
          🌋
        </div>

        <p className="auth-card__eyebrow">VOLCANO EXPLORER</p>
        <h1>Bienvenido</h1>

        <p className="auth-card__description">
          Ingresa la clave de acceso para consultar el catálogo de volcanes.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="api-key">API key</label>

          <div className="auth-form__input-wrapper">
            <input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Ingresa tu API key"
              autoComplete="off"
              disabled={loading}
              required
            />

            <button
              type="button"
              className="auth-form__toggle"
              onClick={() => setShowKey((current) => !current)}
              disabled={loading}
            >
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading || !apiKey.trim()}
          >
            {loading ? 'Validando acceso...' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-card__note">
          La clave se conservará únicamente durante esta sesión del navegador.
        </p>
      </section>
    </main>
  );
}

export default ApiKeyGate;
