import { describe, expect, it } from 'vitest';
import { UpstreamError } from '../../../src/domain/errors';
import { parseForecastPayload, parseGeocodingPayload } from '../../../src/infrastructure/open-meteo/parse';
import { bogotaForecast, bogotaGeocoding, bogotaReport } from '../../fixtures/bogota';

describe('parseGeocodingPayload', () => {
  it('reads the first localized result', () => {
    expect(parseGeocodingPayload(bogotaGeocoding)).toEqual({
      name: 'Bogotá',
      country: 'Colombia',
      latitude: 4.60971,
      longitude: -74.08175,
      timezone: 'America/Bogota',
    });
  });

  it.each([
    [{ generationtime_ms: 0.2 }],
    [{ results: null }],
    [{ results: [] }],
  ])('returns null when the city does not exist: %j', (payload) => {
    expect(parseGeocodingPayload(payload)).toBeNull();
  });

  it('names the country from country_code when Open-Meteo omits it (Gaza)', () => {
    const gaza = {
      results: [
        {
          name: 'Gaza',
          latitude: 31.50161,
          longitude: 34.46672,
          country_code: 'PS',
          timezone: 'Asia/Gaza',
        },
      ],
    };

    expect(parseGeocodingPayload(gaza)?.country).toBe('Territorios Palestinos');
  });

  it('fails closed when neither country nor a valid country_code is present', () => {
    const city = structuredClone(bogotaGeocoding.results[0]) as Record<string, unknown>;
    delete city.country;
    city.country_code = 'nope';

    expect(() => parseGeocodingPayload({ results: [city] })).toThrow(UpstreamError);
  });

  it('fails closed when the list is present but unusable', () => {
    expect(() => parseGeocodingPayload({ results: [{ name: 'Bogotá' }] })).toThrow(UpstreamError);
    expect(() => parseGeocodingPayload({ results: 'nope' })).toThrow(UpstreamError);
    expect(() => parseGeocodingPayload(null)).toThrow(UpstreamError);
  });
});

describe('parseForecastPayload', () => {
  it('maps current conditions onto the public contract', () => {
    expect(parseForecastPayload(bogotaForecast)).toEqual(bogotaReport.current);
  });

  it('truncates seconds so observedAt matches the contract precision', () => {
    const payload = structuredClone(bogotaForecast);
    payload.current.time = '2026-10-27T09:00:00';

    expect(parseForecastPayload(payload).observedAt).toBe('2026-10-27T09:00');
  });

  it('keeps an unknown weather code as a stable default instead of failing the request', () => {
    const payload = structuredClone(bogotaForecast);
    payload.current.weather_code = 4;

    expect(parseForecastPayload(payload).condition).toBe('Condición desconocida');
  });

  it.each([
    ['missing current', { current_units: bogotaForecast.current_units }],
    ['null temperature', withCurrent({ temperature_2m: null })],
    ['blank unit', withUnits({ temperature_2m: '  ' })],
    ['fractional code', withCurrent({ weather_code: 2.5 })],
    ['zoned timestamp', withCurrent({ time: '2026-10-27T09:00:00Z' })],
  ])('rejects %s', (_name, payload) => {
    expect(() => parseForecastPayload(payload)).toThrow(UpstreamError);
  });
});

function withCurrent(patch: Record<string, unknown>) {
  const payload = structuredClone(bogotaForecast);
  Object.assign(payload.current, patch);
  return payload;
}

function withUnits(patch: Record<string, unknown>) {
  const payload = structuredClone(bogotaForecast);
  Object.assign(payload.current_units, patch);
  return payload;
}
