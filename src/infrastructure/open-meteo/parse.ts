import { UpstreamError } from '../../domain/errors';
import { describeWeatherCode } from '../../domain/weather-codes';
import type { CurrentConditions, GeocodedCity, Measurement } from '../../domain/weather-report';

const OBSERVED_AT = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const REGION_NAMES = new Intl.DisplayNames(['es'], { type: 'region' });

/**
 * `null` significa ciudad inexistente (results ausente, null o vacío).
 * Un resultado presente pero mal formado es un fallo del upstream.
 */
export function parseGeocodingPayload(payload: unknown): GeocodedCity | null {
  if (!isRecord(payload)) {
    throw new UpstreamError('Open-Meteo geocoding response is not an object');
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'results') || payload.results == null) {
    return null;
  }

  if (!Array.isArray(payload.results)) {
    throw new UpstreamError('Open-Meteo geocoding response has an invalid results list');
  }

  const first: unknown = payload.results[0];
  if (first === undefined) {
    return null;
  }

  return parseCity(first);
}

export function parseForecastPayload(payload: unknown): CurrentConditions {
  if (!isRecord(payload) || !isRecord(payload.current) || !isRecord(payload.current_units)) {
    throw new UpstreamError('Open-Meteo forecast response is missing current conditions');
  }

  const current = payload.current;
  const units = payload.current_units;
  const weatherCode = current.weather_code;
  if (typeof weatherCode !== 'number' || !Number.isInteger(weatherCode)) {
    throw new UpstreamError("Open-Meteo forecast response is missing 'weather_code'");
  }

  return {
    temperature: readMeasurement(current, units, 'temperature_2m'),
    humidity: readMeasurement(current, units, 'relative_humidity_2m'),
    windSpeed: readMeasurement(current, units, 'wind_speed_10m'),
    condition: describeWeatherCode(weatherCode),
    observedAt: readObservedAt(current.time),
  };
}

function parseCity(value: unknown): GeocodedCity {
  if (!isRecord(value)) {
    throw new UpstreamError('Open-Meteo geocoding response has an invalid city');
  }

  return {
    name: readString(value, 'name'),
    country: readCountry(value),
    latitude: readCoordinate(value, 'latitude', -90, 90),
    longitude: readCoordinate(value, 'longitude', -180, 180),
    timezone: readString(value, 'timezone'),
  };
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new UpstreamError(`Open-Meteo geocoding response is missing '${field}'`);
  }
  return value.trim();
}

/**
 * Open-Meteo omite `country` en territorios sin país reconocido (Gaza trae
 * solo `country_code: "PS"`). En ese caso el nombre sale del código ISO.
 */
function readCountry(record: Record<string, unknown>): string {
  const country = record.country;
  if (typeof country === 'string' && country.trim() !== '') {
    return country.trim();
  }

  const code = record.country_code;
  const name = typeof code === 'string' && COUNTRY_CODE.test(code) ? REGION_NAMES.of(code) : undefined;
  if (name === undefined) {
    throw new UpstreamError("Open-Meteo geocoding response is missing 'country'");
  }
  return name;
}

function readCoordinate(
  record: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new UpstreamError(`Open-Meteo geocoding response has an invalid '${field}'`);
  }
  return value;
}

function readMeasurement(
  current: Record<string, unknown>,
  units: Record<string, unknown>,
  field: string,
): Measurement {
  const value = current[field];
  const unit = units[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UpstreamError(`Open-Meteo forecast response is missing '${field}'`);
  }
  if (typeof unit !== 'string' || unit.trim() === '') {
    throw new UpstreamError(`Open-Meteo forecast response is missing the unit for '${field}'`);
  }
  return { value, unit };
}

function readObservedAt(value: unknown): string {
  if (typeof value !== 'string') {
    throw new UpstreamError("Open-Meteo forecast response is missing 'time'");
  }

  const minute = OBSERVED_AT.exec(value)?.[1];
  if (minute === undefined) {
    throw new UpstreamError("Open-Meteo forecast response has an invalid 'time'");
  }
  return minute;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
