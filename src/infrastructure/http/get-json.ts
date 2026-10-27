import type { Logger } from '../../application/logger';
import { UpstreamError } from '../../domain/errors';

/** Open-Meteo responde poco. Un tope evita leer un cuerpo enorme si la URL base apunta a otro sitio. */
export const MAX_UPSTREAM_BODY_CHARS = 1_000_000;

export type UpstreamService = 'geocoding' | 'forecast';

export type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export interface GetJsonOptions {
  readonly timeoutMs: number;
  readonly service: UpstreamService;
  readonly logger: Logger;
  readonly fetchImpl?: FetchLike;
}

export async function getJson(url: URL, options: GetJsonOptions): Promise<unknown> {
  const started = Date.now();
  const fetchImpl = options.fetchImpl ?? defaultFetch;

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'weather-api',
      },
      signal: AbortSignal.timeout(options.timeoutMs),
    });

    if (!response.ok) {
      await cancelBody(response);
      throw new UpstreamError(
        `Open-Meteo ${options.service} responded with HTTP ${response.status}`,
      );
    }

    const declaredLength = numberHeader(response.headers.get('content-length'));
    if (declaredLength !== undefined && declaredLength > MAX_UPSTREAM_BODY_CHARS) {
      await cancelBody(response);
      throw new UpstreamError(`Open-Meteo ${options.service} response exceeded the size limit`);
    }

    const text = await response.text();
    if (text.length > MAX_UPSTREAM_BODY_CHARS) {
      throw new UpstreamError(`Open-Meteo ${options.service} response exceeded the size limit`);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch (cause) {
      throw new UpstreamError(`Open-Meteo ${options.service} returned invalid JSON`, { cause });
    }

    options.logger.info('upstream.completed', {
      service: options.service,
      statusCode: response.status,
      durationMs: Date.now() - started,
    });
    return payload;
  } catch (error) {
    if (error instanceof UpstreamError) {
      options.logger.error('upstream.failed', {
        service: options.service,
        durationMs: Date.now() - started,
        detail: error.logDetail,
      });
      throw error;
    }

    const timeout = isTimeoutError(error);
    const detail = timeout
      ? `Open-Meteo ${options.service} exceeded ${options.timeoutMs}ms`
      : `Open-Meteo ${options.service} request failed`;

    options.logger.error('upstream.failed', {
      service: options.service,
      durationMs: Date.now() - started,
      detail,
      timeout,
      cause: errorName(error),
    });
    throw new UpstreamError(detail, { cause: error });
  }
}

function defaultFetch(input: URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

function numberHeader(value: string | null): number | undefined {
  if (value === null || !/^[0-9]+$/.test(value)) {
    return undefined;
  }
  return Number(value);
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // El estado HTTP ya se conoce. Un fallo al cerrar el cuerpo no debe tapar el error real.
  }
}

function isTimeoutError(error: unknown): boolean {
  if (hasTimeoutName(error)) {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return hasTimeoutName(error.cause);
  }
  return false;
}

function hasTimeoutName(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  return error.name === 'TimeoutError' || error.name === 'AbortError';
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
