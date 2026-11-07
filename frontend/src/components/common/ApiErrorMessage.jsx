function ApiErrorMessage({ error, prefix, className }) {
  if (!error) return null;

  const message = error.message || 'Se produjo un error inesperado.';
  const requestId = error.requestId || error.request_id || null;

  return (
    <div className={className} role="alert">
      <p>{prefix ? `${prefix} ${message}` : message}</p>

      {error.status != null && (
        <p><small>Estado HTTP: {error.status}</small></p>
      )}

      {error.code && (
        <p><small>Código de error: {error.code}</small></p>
      )}

      {requestId && (
        <p><small>Identificador de solicitud: {requestId}</small></p>
      )}
    </div>
  );
}

export default ApiErrorMessage;
