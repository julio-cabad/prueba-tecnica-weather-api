import { createGetCurrentWeather } from '../application/get-current-weather';
import { loadConfig } from '../config/env';
import type { FetchLike } from '../infrastructure/http/get-json';
import { createLogger } from '../infrastructure/logging/logger';
import { createOpenMeteoForecast } from '../infrastructure/open-meteo/forecast';
import { createOpenMeteoGeocoder } from '../infrastructure/open-meteo/geocoder';
import type { HandlerDependencies } from '../interfaces/http/create-handler';

export interface CreateDependenciesOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: FetchLike;
}

/** Único lugar que conoce los adaptadores concretos. */
export function createDependencies(options: CreateDependenciesOptions = {}): HandlerDependencies {
  const config = loadConfig(options.env ?? process.env);
  const fetchOptions = options.fetchImpl ? { fetchImpl: options.fetchImpl } : {};
  const geocoder = createOpenMeteoGeocoder({ baseUrl: config.geocodingBaseUrl, ...fetchOptions });
  const forecast = createOpenMeteoForecast({ baseUrl: config.forecastBaseUrl, ...fetchOptions });

  return {
    getCurrentWeather: createGetCurrentWeather(geocoder, forecast),
    contextFor: (requestId) => ({
      logger: createLogger({
        requestId,
        level: config.logLevel,
      }),
      // El reloj arranca con la petición y lo comparten las dos llamadas.
      signal: AbortSignal.timeout(config.upstreamTimeoutMs),
    }),
  };
}
