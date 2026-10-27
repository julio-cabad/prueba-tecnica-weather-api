import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env';
import { ConfigError, INTERNAL_ERROR_MESSAGE } from '../../src/domain/errors';

const validEnv = {
  GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
  FORECAST_BASE_URL: 'https://api.open-meteo.com/',
  UPSTREAM_TIMEOUT_MS: '5000',
  LOG_LEVEL: 'debug',
};

describe('loadConfig', () => {
  it('reads origins, timeout and log level', () => {
    expect(loadConfig(validEnv)).toEqual({
      geocodingBaseUrl: 'https://geocoding-api.open-meteo.com',
      forecastBaseUrl: 'https://api.open-meteo.com',
      upstreamTimeoutMs: 5000,
      logLevel: 'debug',
    });
  });

  it('defaults timeout and log level when they are omitted', () => {
    const config = loadConfig({
      GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
      FORECAST_BASE_URL: 'http://127.0.0.1:9',
    });

    expect(config.upstreamTimeoutMs).toBe(5000);
    expect(config.logLevel).toBe('info');
    expect(config.forecastBaseUrl).toBe('http://127.0.0.1:9');
  });

  it('rejects a missing or credentialed base URL without echoing the value', () => {
    expect(() => loadConfig({ FORECAST_BASE_URL: 'https://api.open-meteo.com' })).toThrow(ConfigError);

    try {
      loadConfig({
        GEOCODING_BASE_URL: 'https://user:secret-token@evil.test',
        FORECAST_BASE_URL: 'https://api.open-meteo.com',
      });
      expect.fail('expected a configuration error');
    } catch (error) {
      if (error instanceof Error && error.message === 'expected a configuration error') {
        throw error;
      }
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).message).toBe(INTERNAL_ERROR_MESSAGE);
      expect((error as ConfigError).logDetail).not.toContain('secret-token');
      expect((error as ConfigError).message).not.toContain('secret-token');
    }
  });

  it.each(['abc', '0', '99', '5001', '10000', '-5'])('rejects timeout %s', (timeout) => {
    expect(() =>
      loadConfig({
        ...validEnv,
        UPSTREAM_TIMEOUT_MS: timeout,
      }),
    ).toThrow(ConfigError);
  });

  it('accepts only timeouts that keep two upstream calls inside the Lambda budget', () => {
    expect(loadConfig({ ...validEnv, UPSTREAM_TIMEOUT_MS: '100' }).upstreamTimeoutMs).toBe(100);
    expect(loadConfig({ ...validEnv, UPSTREAM_TIMEOUT_MS: '5000' }).upstreamTimeoutMs).toBe(5000);
  });

  it('rejects an unknown log level', () => {
    expect(() => loadConfig({ ...validEnv, LOG_LEVEL: 'verbose' })).toThrow(ConfigError);
  });

  it('rejects a base URL that already includes a path', () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com/v1',
      }),
    ).toThrow(ConfigError);
  });
});
