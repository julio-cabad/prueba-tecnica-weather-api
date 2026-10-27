import { ConfigError } from '../domain/errors';
import { isLogLevel, type LogLevel } from '../infrastructure/logging/log-level';

export interface AppConfig {
  readonly geocodingBaseUrl: string;
  readonly forecastBaseUrl: string;
  readonly upstreamTimeoutMs: number;
  readonly logLevel: LogLevel;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 100;
// El contrato de errores fija 5 s para Open-Meteo. Un presupuesto mayor
// incumpliría ese umbral.
const MAX_TIMEOUT_MS = 5_000;

/**
 * Lee la configuración del proceso.
 * Las URLs son orígenes (sin path ni credenciales). `UPSTREAM_TIMEOUT_MS` es el
 * presupuesto total de una petición para Open-Meteo (geocoding + forecast) y
 * no supera los 5 s del contrato de errores.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    geocodingBaseUrl: readBaseUrl(env.GEOCODING_BASE_URL, 'GEOCODING_BASE_URL'),
    forecastBaseUrl: readBaseUrl(env.FORECAST_BASE_URL, 'FORECAST_BASE_URL'),
    upstreamTimeoutMs: readTimeout(env.UPSTREAM_TIMEOUT_MS),
    logLevel: readLogLevel(env.LOG_LEVEL),
  };
}

function readBaseUrl(value: string | undefined, key: string): string {
  if (value === undefined || value.trim() === '') {
    throw new ConfigError(key);
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConfigError(key);
  }

  const pathAllowed = url.pathname === '/' || url.pathname === '';
  const protocolAllowed = url.protocol === 'https:' || url.protocol === 'http:';
  if (
    !protocolAllowed ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    !pathAllowed
  ) {
    throw new ConfigError(key);
  }

  return url.origin;
}

function readTimeout(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_TIMEOUT_MS;
  }

  const raw = value.trim();
  if (!/^[0-9]+$/.test(raw)) {
    throw new ConfigError('UPSTREAM_TIMEOUT_MS');
  }

  const parsed = Number(raw);
  if (parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    throw new ConfigError('UPSTREAM_TIMEOUT_MS');
  }

  return parsed;
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === undefined || value.trim() === '') {
    return 'info';
  }

  const normalized = value.trim().toLowerCase();
  if (!isLogLevel(normalized)) {
    throw new ConfigError('LOG_LEVEL');
  }

  return normalized;
}
