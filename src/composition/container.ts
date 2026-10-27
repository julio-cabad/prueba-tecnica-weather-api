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
  const geocoder = createOpenMeteoGeocoder({
    baseUrl: config.geocodingBaseUrl,
    timeoutMs: config.upstreamTimeoutMs,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const forecast = createOpenMeteoForecast({
    baseUrl: config.forecastBaseUrl,
    timeoutMs: config.upstreamTimeoutMs,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  return {
    getCurrentWeather: createGetCurrentWeather(geocoder, forecast),
    loggerFor: (requestId) =>
      createLogger({
        requestId,
        level: config.logLevel,
      }),
  };
}
