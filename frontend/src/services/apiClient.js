const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

const API_KEY_STORAGE = 'volcano-explorer-api-key';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getStoredApiKey = () => {
  return sessionStorage.getItem(API_KEY_STORAGE);
};

export const storeApiKey = (apiKey) => {
  const normalizedKey = apiKey?.trim();

  if (!normalizedKey) {
    throw new Error('API key is required.');
  }

  sessionStorage.setItem(API_KEY_STORAGE, normalizedKey);
};

export const clearApiKey = () => {
  sessionStorage.removeItem(API_KEY_STORAGE);
  window.dispatchEvent(new Event('api-auth-required'));
};

export const validateApiKey = async (candidateKey) => {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  const normalizedKey = candidateKey?.trim();

  if (!normalizedKey) {
    throw new Error('Ingresa la API key para continuar.');
  }

  const response = await fetch(`${API_BASE_URL}/items?limit=1`, {
    method: 'GET',
    headers: {
      'x-api-key': normalizedKey,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(
      'La API key no es válida. Verifica el valor e inténtalo nuevamente.',
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      'No fue posible validar la clave. Inténtalo nuevamente.',
      response.status,
    );
  }

  storeApiKey(normalizedKey);
  return true;
};

export const request = async (path, options = {}) => {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured.');
  }

  const apiKey = getStoredApiKey();

  if (!apiKey) {
    window.dispatchEvent(new Event('api-auth-required'));
    throw new ApiError('API key is required.', 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearApiKey();
    throw new ApiError('Invalid or expired API key.', response.status);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || 'The API request failed.',
      response.status,
    );
  }

  return body;
};
