import { describe, expect, it } from 'vitest';
import {
  CityNotFoundError,
  ConfigError,
  INTERNAL_ERROR_MESSAGE,
  InvalidRequestError,
  UPSTREAM_ERROR_MESSAGE,
  UpstreamError,
} from '../../src/domain/errors';

describe('application errors', () => {
  it('keeps the client message free of internal detail', () => {
    const error = new UpstreamError('Open-Meteo geocoding responded with HTTP 500');

    expect(error.code).toBe('UPSTREAM_ERROR');
    expect(error.message).toBe(UPSTREAM_ERROR_MESSAGE);
    expect(error.logDetail).toContain('HTTP 500');
    expect(error.message).not.toContain('HTTP 500');
  });

  it('builds the city-not-found message from the normalized name', () => {
    const error = new CityNotFoundError('Ciudadinventada');

    expect(error.code).toBe('CITY_NOT_FOUND');
    expect(error.message).toBe("No se encontró la ciudad 'Ciudadinventada'");
  });

  it('hides configuration keys from the client message', () => {
    const error = new ConfigError('GEOCODING_BASE_URL');

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(error.logDetail).toContain('GEOCODING_BASE_URL');
    expect(error.message).not.toContain('GEOCODING_BASE_URL');
  });

  it('uses the validation text as both client and log message', () => {
    const error = new InvalidRequestError('faltó city');

    expect(error.code).toBe('INVALID_REQUEST');
    expect(error.message).toBe('faltó city');
    expect(error.logDetail).toBe('faltó city');
  });
});
