import { describe, expect, it } from 'vitest';
import { createOpenMeteoForecast } from '../../../src/infrastructure/open-meteo/forecast';
import { createOpenMeteoGeocoder } from '../../../src/infrastructure/open-meteo/geocoder';
import type { FetchLike } from '../../../src/infrastructure/http/get-json';
import { bogotaCity, bogotaForecast, bogotaGeocoding, bogotaReport } from '../../fixtures/bogota';
import { noopLogger } from '../../helpers/logger';

describe('Open-Meteo adapters', () => {
  it('searches by the trimmed city name and returns null when there are no results', async () => {
    const calls: URL[] = [];
    const fetchImpl: FetchLike = async (input) => {
      calls.push(input);
      return Response.json({ generationtime_ms: 0.1 });
    };
    const geocoder = createOpenMeteoGeocoder({
      baseUrl: 'https://geocoding-api.open-meteo.com',
      timeoutMs: 5000,
      fetchImpl,
    });

    const city = await geocoder.search('Bogotá', { logger: noopLogger() });

    expect(city).toBeNull();
    expect(calls[0]?.searchParams.get('name')).toBe('Bogotá');
    expect(calls[0]?.searchParams.get('count')).toBe('1');
    expect(calls[0]?.searchParams.get('language')).toBe('es');
    expect(calls[0]?.pathname).toBe('/v1/search');
  });

  it('asks the forecast service for the geocoded coordinates and timezone', async () => {
    const calls: URL[] = [];
    const fetchImpl: FetchLike = async (input) => {
      calls.push(input);
      return Response.json(bogotaForecast);
    };
    const forecast = createOpenMeteoForecast({
      baseUrl: 'https://api.open-meteo.com',
      timeoutMs: 5000,
      fetchImpl,
    });

    const current = await forecast.getCurrent(bogotaCity, { logger: noopLogger() });

    expect(current).toEqual(bogotaReport.current);
    expect(calls[0]?.pathname).toBe('/v1/forecast');
    expect(calls[0]?.searchParams.get('latitude')).toBe('4.60971');
    expect(calls[0]?.searchParams.get('longitude')).toBe('-74.08175');
    expect(calls[0]?.searchParams.get('timezone')).toBe('America/Bogota');
    expect(calls[0]?.searchParams.get('current')).toBe(
      'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    );
  });

  it('parses a hit from geocoding', async () => {
    const geocoder = createOpenMeteoGeocoder({
      baseUrl: 'https://geocoding-api.open-meteo.com',
      timeoutMs: 5000,
      fetchImpl: async () => Response.json(bogotaGeocoding),
    });

    await expect(geocoder.search('Bogota', { logger: noopLogger() })).resolves.toEqual(bogotaCity);
  });
});
