import { describe, expect, it } from 'vitest';
import { createGetCurrentWeather } from '../../src/application/get-current-weather';
import type { ForecastProvider, Geocoder } from '../../src/application/ports';
import { CityNotFoundError, InvalidRequestError, UpstreamError } from '../../src/domain/errors';
import { bogotaCity, bogotaReport } from '../fixtures/bogota';
import { testContext } from '../helpers/context';

const ctx = testContext();

describe('getCurrentWeather', () => {
  it('returns the localized city from geocoding, not the text the user typed', async () => {
    const geocoder = fakeGeocoder(bogotaCity);
    const forecast = fakeForecast(bogotaReport.current);
    const getCurrentWeather = createGetCurrentWeather(geocoder, forecast);

    const report = await getCurrentWeather('  Bogota  ', ctx);

    expect(geocoder.calls).toEqual(['Bogota']);
    expect(forecast.calls).toEqual([bogotaCity]);
    expect(JSON.stringify(report)).toBe(JSON.stringify(bogotaReport));
  });

  it('does not call Open-Meteo when the city is invalid', async () => {
    const geocoder = fakeGeocoder(bogotaCity);
    const forecast = fakeForecast(bogotaReport.current);
    const getCurrentWeather = createGetCurrentWeather(geocoder, forecast);

    await expect(getCurrentWeather(' ', ctx)).rejects.toBeInstanceOf(InvalidRequestError);
    expect(geocoder.calls).toEqual([]);
    expect(forecast.calls).toEqual([]);
  });

  it('does not call the forecast when the city does not exist', async () => {
    const geocoder = fakeGeocoder(null);
    const forecast = fakeForecast(bogotaReport.current);
    const getCurrentWeather = createGetCurrentWeather(geocoder, forecast);

    await expect(getCurrentWeather('Ciudadinventada', ctx)).rejects.toEqual(
      expect.objectContaining({
        code: 'CITY_NOT_FOUND',
        message: "No se encontró la ciudad 'Ciudadinventada'",
      }),
    );
    expect(forecast.calls).toEqual([]);
    await expect(getCurrentWeather('Ciudadinventada', ctx)).rejects.toBeInstanceOf(CityNotFoundError);
  });

  it('propagates an upstream failure from the forecast', async () => {
    const geocoder = fakeGeocoder(bogotaCity);
    const forecast: ForecastProvider = {
      async getCurrent() {
        throw new UpstreamError('Open-Meteo forecast exceeded the request time budget');
      },
    };

    await expect(createGetCurrentWeather(geocoder, forecast)('Bogota', ctx)).rejects.toBeInstanceOf(
      UpstreamError,
    );
  });
});

function fakeGeocoder(city: typeof bogotaCity | null): Geocoder & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async search(name) {
      calls.push(name);
      return city;
    },
  };
}

function fakeForecast(
  current: typeof bogotaReport.current,
): ForecastProvider & { calls: Array<typeof bogotaCity> } {
  const calls: Array<typeof bogotaCity> = [];
  return {
    calls,
    async getCurrent(city) {
      calls.push(city);
      return current;
    },
  };
}
