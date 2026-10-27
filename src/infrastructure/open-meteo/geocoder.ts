import type { Geocoder } from '../../application/ports';
import { getJson } from '../http/get-json';
import type { OpenMeteoClientOptions } from './options';
import { parseGeocodingPayload } from './parse';

export function createOpenMeteoGeocoder(options: OpenMeteoClientOptions): Geocoder {
  return {
    async search(name, ctx) {
      const url = new URL('/v1/search', options.baseUrl);
      url.searchParams.set('name', name);
      url.searchParams.set('count', '1');
      // language=es devuelve el nombre localizado (Bogotá) que exige el contrato.
      url.searchParams.set('language', 'es');

      const payload = await getJson(url, {
        timeoutMs: options.timeoutMs,
        service: 'geocoding',
        logger: ctx.logger,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      });

      return parseGeocodingPayload(payload);
    },
  };
}
