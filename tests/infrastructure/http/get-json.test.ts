import { describe, expect, it } from 'vitest';
import { UPSTREAM_ERROR_MESSAGE, UpstreamError } from '../../../src/domain/errors';
import { MAX_UPSTREAM_BODY_CHARS, getJson, type FetchLike } from '../../../src/infrastructure/http/get-json';
import { captureLogger } from '../../helpers/logger';

const url = new URL('https://geocoding-api.open-meteo.com/v1/search');

describe('getJson', () => {
  it('returns the parsed JSON body', async () => {
    const logs = captureLogger();
    const payload = await getJson(url, {
      signal: AbortSignal.timeout(5000),
      service: 'geocoding',
      logger: logs.logger,
      fetchImpl: async () => Response.json({ ok: true }),
    });

    expect(payload).toEqual({ ok: true });
    expect(logs.entries()[0]).toMatchObject({
      message: 'upstream.completed',
      service: 'geocoding',
      statusCode: 200,
    });
  });

  it('maps a non-2xx response to a client-safe upstream error and does not read the body', async () => {
    const logs = captureLogger();
    const error = await getJson(url, {
      signal: AbortSignal.timeout(5000),
      service: 'forecast',
      logger: logs.logger,
      fetchImpl: async () => new Response('secret-token', { status: 503 }),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).message).toBe(UPSTREAM_ERROR_MESSAGE);
    expect((error as UpstreamError).logDetail).toContain('HTTP 503');
    expect((error as UpstreamError).logDetail).not.toContain('secret-token');
    expect(JSON.stringify(logs.entries())).not.toContain('secret-token');
  });

  it('maps invalid JSON to an upstream error', async () => {
    const error = await getJson(url, {
      signal: AbortSignal.timeout(5000),
      service: 'geocoding',
      logger: captureLogger().logger,
      fetchImpl: async () => new Response('not-json', { status: 200 }),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).logDetail).toContain('invalid JSON');
  });

  it('maps a transport failure to an upstream error', async () => {
    const error = await getJson(url, {
      signal: AbortSignal.timeout(5000),
      service: 'geocoding',
      logger: captureLogger().logger,
      fetchImpl: async () => {
        throw new TypeError('fetch failed');
      },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).logDetail).toContain('request failed');
  });

  it('aborts when the request budget runs out', async () => {
    const fetchImpl: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('missing signal'));
          return;
        }
        const abort = () => {
          reject(signal.reason ?? new DOMException('timeout', 'TimeoutError'));
        };
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener('abort', abort, { once: true });
      });

    const error = await getJson(url, {
      signal: AbortSignal.timeout(20),
      service: 'forecast',
      logger: captureLogger().logger,
      fetchImpl,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).logDetail).toContain('exceeded the request time budget');
  });

  it('rejects a body larger than the configured limit', async () => {
    const error = await getJson(url, {
      signal: AbortSignal.timeout(5000),
      service: 'forecast',
      logger: captureLogger().logger,
      fetchImpl: async () =>
        new Response(`{"a":"${'x'.repeat(MAX_UPSTREAM_BODY_CHARS)}"}`, { status: 200 }),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).logDetail).toContain('size limit');
  });
});
