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
import { testContext } from '../../helpers/context';
import { apiEvent, lambdaContext } from '../../helpers/events';

describe('createHandler', () => {
  it('returns the weather document and a request id header', async () => {
    const lines: string[] = [];
    let receivedCity = '';
    const handler = createHandler({
      contextFor: (requestId) => testContext(createLogger({ requestId, level: 'info', sink: (line) => lines.push(line) })),
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
    ['upstream', 'Bogota', new UpstreamError('Open-Meteo forecast exceeded the request time budget'), 502, 'UPSTREAM_ERROR'],
  ] as const)('maps %s to the error envelope', async (_name, city, error, status, code) => {
    const lines: string[] = [];
    const handler = createHandler({
      contextFor: (requestId) => testContext(createLogger({ requestId, level: 'debug', sink: (line) => lines.push(line) })),
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

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])(
    'answers %s /weather with 405 and Allow: GET without calling the use case',
    async (httpMethod) => {
      const lines: string[] = [];
      const getCurrentWeather = spyOnUseCase();
      const handler = createHandler({
        contextFor: (requestId) => testContext(createLogger({ requestId, level: 'debug', sink: (line) => lines.push(line) })),
        getCurrentWeather,
      });

      const response = await handler(apiEvent({ city: 'Bogota', httpMethod, requestId: 'req-405' }), lambdaContext());

      expect(response.statusCode).toBe(405);
      expect(response.headers).toMatchObject({
        Allow: 'GET',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-Id': 'req-405',
      });
      expect(JSON.parse(response.body)).toEqual({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido. Usa GET /weather?city={ciudad}.' },
      });
      expect(getCurrentWeather.calls).toBe(0);
      expect(JSON.parse(lines.at(-1) ?? '{}')).toMatchObject({
        level: 'warn',
        message: 'request.failed',
        code: 'METHOD_NOT_ALLOWED',
        requestId: 'req-405',
      });
    },
  );

  it.each([
    ['/{proxy+}', '/noexiste', 'GET'],
    ['/{proxy+}', '/weather/extra', 'GET'],
    ['/{proxy+}', '/noexiste', 'POST'],
    ['/', '/', 'GET'],
  ])('answers resource %s (path %s, %s) with 404 NOT_FOUND', async (resource, path, httpMethod) => {
    const getCurrentWeather = spyOnUseCase();
    const handler = createHandler({ contextFor: () => testContext(), getCurrentWeather });

    const response = await handler(
      apiEvent({ city: 'Bogota', resource, path, httpMethod, requestId: 'req-404' }),
      lambdaContext(),
    );

    expect(response.statusCode).toBe(404);
    expect(response.headers?.['X-Request-Id']).toBe('req-404');
    expect(response.headers).not.toHaveProperty('Allow');
    expect(JSON.parse(response.body)).toEqual({
      error: { code: 'NOT_FOUND', message: 'La ruta no existe. Usa GET /weather?city={ciudad}.' },
    });
    expect(getCurrentWeather.calls).toBe(0);
  });

  it('masks unexpected failures, including their stack', async () => {
    const lines: string[] = [];
    const handler = createHandler({
      contextFor: (requestId) => testContext(createLogger({ requestId, level: 'error', sink: (line) => lines.push(line) })),
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

function spyOnUseCase(): GetCurrentWeather & { calls: number } {
  const useCase = Object.assign(
    async () => {
      useCase.calls += 1;
      return bogotaReport;
    },
    { calls: 0 },
  );
  return useCase;
}

function rejecting(error: unknown): GetCurrentWeather {
  return async () => {
    throw error;
  };
}
