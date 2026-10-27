import { describe, expect, it } from 'vitest';
import { createDependencies } from '../../src/composition/container';
import type { FetchLike } from '../../src/infrastructure/http/get-json';
import { bogotaForecast, bogotaGeocoding, bogotaReport } from '../fixtures/bogota';

describe('Bogotá contract', () => {
  it('turns the two Open-Meteo payloads into the public weather document', async () => {
    const fetchImpl: FetchLike = async (input) => {
      if (input.hostname === 'geocoding-api.open-meteo.com') {
        return Response.json(bogotaGeocoding);
      }
      if (input.hostname === 'api.open-meteo.com') {
        return Response.json(bogotaForecast);
      }
      throw new Error(`unexpected host ${input.hostname}`);
    };

    const { getCurrentWeather, contextFor } = createDependencies({
      env: {
        GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
        FORECAST_BASE_URL: 'https://api.open-meteo.com',
        UPSTREAM_TIMEOUT_MS: '5000',
        LOG_LEVEL: 'error',
      },
      fetchImpl,
    });

    const report = await getCurrentWeather('Bogota', contextFor('req-contract'));

    expect(report).toEqual(bogotaReport);
    expect(JSON.stringify(report)).toBe(JSON.stringify(bogotaReport));
  });
});
