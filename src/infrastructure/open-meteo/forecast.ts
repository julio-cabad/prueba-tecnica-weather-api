import type { ForecastProvider } from '../../application/ports';
import { getJson } from '../http/get-json';
import type { OpenMeteoClientOptions } from './options';
import { parseForecastPayload } from './parse';

const CURRENT_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'weather_code',
].join(',');

export function createOpenMeteoForecast(options: OpenMeteoClientOptions): ForecastProvider {
  return {
    async getCurrent(city, ctx) {
      const url = new URL('/v1/forecast', options.baseUrl);
      url.searchParams.set('latitude', String(city.latitude));
      url.searchParams.set('longitude', String(city.longitude));
      url.searchParams.set('current', CURRENT_VARIABLES);
      // La zona viene del geocoding para que observedAt coincida con `timezone`.
      url.searchParams.set('timezone', city.timezone);

      const payload = await getJson(url, {
        signal: ctx.signal,
        service: 'forecast',
        logger: ctx.logger,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      });

      return parseForecastPayload(payload);
    },
  };
}
