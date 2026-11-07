// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

let request;
let storeApiKey;

describe('apiClient - reintentos HTTP 503', () => {
  beforeEach(async () => {
    vi.resetModules();

    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();

    sessionStorage.clear();

    const client = await import('./apiClient');

    request = client.request;
    storeApiKey = client.storeApiKey;

    storeApiKey('test-api-key');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const successResponse = () => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      data: [],
      page: {},
    }),
  });

  const errorResponse = (status) => ({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({
      error: {
        message: `HTTP ${status}`,
      },
    }),
  });

  it('realiza una sola solicitud cuando responde 200', async () => {
    fetch.mockResolvedValueOnce(successResponse());

    await expect(request('/items')).resolves.toEqual({
      data: [],
      page: {},
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reintenta una vez cuando recibe 503 y luego obtiene 200', async () => {
    fetch
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(successResponse());

    const promise = request('/items');

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual({
      data: [],
      page: {},
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reintenta dos veces cuando recibe dos respuestas 503', async () => {
    fetch
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(successResponse());

    const promise = request('/items');

    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toEqual({
      data: [],
      page: {},
    });

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('devuelve error después de tres respuestas 503', async () => {
    fetch
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(errorResponse(503));

    const promise = request('/items');

    const assertion = expect(promise).rejects.toMatchObject({
      status: 503,
    });

    await vi.advanceTimersByTimeAsync(1500);

    await assertion;

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('limpia la API key ante un 401 sin reintentar', async () => {
    fetch.mockResolvedValueOnce(errorResponse(401));

    const authEvent = vi.fn();
    window.addEventListener('api-auth-required', authEvent);

    await expect(request('/items')).rejects.toMatchObject({
      status: 401,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('volcano-explorer-api-key')).toBeNull();
    expect(authEvent).toHaveBeenCalledTimes(1);

    window.removeEventListener('api-auth-required', authEvent);
  });

  it('limpia la API key ante un 403 sin reintentar', async () => {
    fetch.mockResolvedValueOnce(errorResponse(403));

    await expect(request('/items')).rejects.toMatchObject({
      status: 403,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('volcano-explorer-api-key')).toBeNull();
  });

  it('no reintenta cuando recibe un error 500', async () => {
    fetch.mockResolvedValueOnce(errorResponse(500));

    await expect(request('/items')).rejects.toMatchObject({
      status: 500,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
