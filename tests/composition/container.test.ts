import { describe, expect, it } from 'vitest';
import { createDependencies } from '../../src/composition/container';
import { UpstreamError } from '../../src/domain/errors';
import type { FetchLike } from '../../src/infrastructure/http/get-json';
import { bogotaForecast, bogotaGeocoding } from '../fixtures/bogota';

const env = {
  GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
  FORECAST_BASE_URL: 'https://api.open-meteo.com',
  UPSTREAM_TIMEOUT_MS: '150',
  LOG_LEVEL: 'error',
};

describe('createDependencies', () => {
  it('shares one Open-Meteo budget across geocoding and forecast', async () => {
    // Cada llamada cabe sola en 150 ms; juntas no.
    const fetchImpl: FetchLike = (input, init) =>
      respondAfter(100, input.pathname === '/v1/search' ? bogotaGeocoding : bogotaForecast, init?.signal);
    const { getCurrentWeather, contextFor } = createDependencies({ env, fetchImpl });

    const error = await getCurrentWeather('Bogota', contextFor('req-budget')).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).logDetail).toBe(
      'Open-Meteo forecast exceeded the request time budget',
    );
  });

  it('gives each request a fresh budget', async () => {
    const { contextFor } = createDependencies({ env });
    const first = contextFor('req-1');
    // Espera a que el presupuesto de la primera petición se agote de verdad,
    // sin suponer cuánto tarda un timer en una máquina cargada.
    await new Promise((resolve) => first.signal.addEventListener('abort', resolve, { once: true }));

    const second = contextFor('req-2');

    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });
});

function respondAfter(ms: number, payload: unknown, signal: AbortSignal | null | undefined) {
  return new Promise<Response>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => resolve(Response.json(payload)), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
