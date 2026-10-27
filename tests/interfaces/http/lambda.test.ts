import { describe, expect, it, vi } from 'vitest';
import { ConfigError, INTERNAL_ERROR_MESSAGE } from '../../../src/domain/errors';
import { createLambdaHandler } from '../../../src/interfaces/http/lambda';
import { apiEvent, lambdaContext } from '../../helpers/events';

describe('createLambdaHandler', () => {
  it('turns a startup failure into the generic 500 envelope', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    const handler = createLambdaHandler({
      resolveDependencies: () => {
        throw new ConfigError('GEOCODING_BASE_URL');
      },
    });

    const response = await handler(apiEvent({ city: 'Bogota', requestId: 'req-boot' }), lambdaContext());

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE },
    });
    expect(response.body).not.toContain('GEOCODING_BASE_URL');
    expect(response.headers?.['X-Request-Id']).toBe('req-boot');
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      level: 'error',
      message: 'request.failed',
      requestId: 'req-boot',
    });
  });

  it('reuses the resolved dependencies across invocations', async () => {
    let builds = 0;
    const handler = createLambdaHandler({
      resolveDependencies: () => {
        builds += 1;
        return {
          loggerFor: () => ({
            debug() {},
            info() {},
            warn() {},
            error() {},
          }),
          getCurrentWeather: async () => {
            throw new Error('unused');
          },
        };
      },
    });

    await handler(apiEvent({ city: 'Bogota' }), lambdaContext());
    await handler(apiEvent({ city: 'Lima' }), lambdaContext());

    expect(builds).toBe(1);
  });
});
