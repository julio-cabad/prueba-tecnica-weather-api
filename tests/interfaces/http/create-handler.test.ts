import { describe, expect, it } from 'vitest';
import type { GetCurrentWeather } from '../../../src/application/get-current-weather';
import {
  CityNotFoundError,
  INTERNAL_ERROR_MESSAGE,
  InvalidRequestError,
  UPSTREAM_ERROR_MESSAGE,
  UpstreamError,
} from '../../../src/domain/errors';
import { createHandler } from '../../../src/interfaces/http/create-handler';
import { createLogger } from '../../../src/infrastructure/logging/logger';
import { bogotaReport } from '../../fixtures/bogota';
import { apiEvent, lambdaContext } from '../../helpers/events';

describe('createHandler', () => {
  it('returns the weather document and a request id header', async () => {
    const lines: string[] = [];
    let receivedCity = '';
    const handler = createHandler({
      loggerFor: (requestId) => createLogger({ requestId, level: 'info', sink: (line) => lines.push(line) }),
      getCurrentWeather: async (city) => {
        receivedCity = city;
        return bogotaReport;
      },
    });

    const response = await handler(apiEvent({ city: '  Bogota  ', requestId: 'req-200' }), lambdaContext());

    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': 'req-200',
    });
    expect(JSON.parse(response.body)).toEqual(bogotaReport);
    expect(receivedCity).toBe('  Bogota  ');
    expect(lines.every((line) => !line.includes('\n'))).toBe(true);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      level: 'info',
      message: 'request.received',
      requestId: 'req-200',
    });
  });

  it.each([
    ['missing city', undefined, new InvalidRequestError("El parámetro 'city' es obligatorio y debe tener al menos 2 caracteres."), 400, 'INVALID_REQUEST'],
    ['unknown city', 'Ciudadinventada', new CityNotFoundError('Ciudadinventada'), 404, 'CITY_NOT_FOUND'],
    ['upstream', 'Bogota', new UpstreamError('Open-Meteo forecast exceeded 5000ms'), 502, 'UPSTREAM_ERROR'],
  ] as const)('maps %s to the error envelope', async (_name, city, error, status, code) => {
    const lines: string[] = [];
    const handler = createHandler({
      loggerFor: (requestId) => createLogger({ requestId, level: 'debug', sink: (line) => lines.push(line) }),
      getCurrentWeather: rejecting(error),
    });

    const response = await handler(
      city === undefined ? apiEvent() : apiEvent({ city }),
      lambdaContext(),
    );
    const body = JSON.parse(response.body) as { error: { code: string; message: string } };

    expect(response.statusCode).toBe(status);
    expect(body.error.code).toBe(code);
    expect(body.error.message).toBe(error.message);
    if (code === 'UPSTREAM_ERROR') {
      expect(body.error.message).toBe(UPSTREAM_ERROR_MESSAGE);
      expect(response.body).not.toContain('exceeded');
    }
    const failure = JSON.parse(lines.at(-1) ?? '{}') as { level: string };
    expect(failure.level).toBe(status >= 500 ? 'error' : 'warn');
  });

  it('masks unexpected failures, including their stack', async () => {
    const lines: string[] = [];
    const handler = createHandler({
      loggerFor: (requestId) => createLogger({ requestId, level: 'error', sink: (line) => lines.push(line) }),
      getCurrentWeather: rejecting(new Error('database password=secret')),
    });

    const response = await handler(apiEvent({ city: 'Bogota' }), lambdaContext());

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE },
    });
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('Error');
    expect(response.body).not.toContain('at ');
    const logged = JSON.parse(lines.at(-1) ?? '{}') as { level: string; stack?: string; detail?: string };
    expect(logged.level).toBe('error');
    expect(logged.detail).toContain('password');
    expect(logged.stack).toContain('password');
  });
});

function rejecting(error: unknown): GetCurrentWeather {
  return async () => {
    throw error;
  };
}
