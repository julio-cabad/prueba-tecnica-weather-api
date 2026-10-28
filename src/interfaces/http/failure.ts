import { AppError, ERROR_CODES, INTERNAL_ERROR_MESSAGE, type ErrorCode } from '../../domain/errors';
import { RouteError, WEATHER_METHODS } from './route';

/**
 * Códigos que agrega la capa HTTP. El dominio no sabe de rutas ni de
 * throttling; TOO_MANY_REQUESTS solo lo responde API Gateway.
 */
export const HTTP_ERROR_CODES = ['NOT_FOUND', 'METHOD_NOT_ALLOWED', 'TOO_MANY_REQUESTS'] as const;

export type PublicErrorCode = ErrorCode | (typeof HTTP_ERROR_CODES)[number];

/** Todos los códigos del contrato, los del dominio primero. */
export const PUBLIC_ERROR_CODES: readonly PublicErrorCode[] = [...ERROR_CODES, ...HTTP_ERROR_CODES];

const STATUS_BY_CODE: Record<PublicErrorCode, number> = {
  INVALID_REQUEST: 400,
  CITY_NOT_FOUND: 404,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export interface ErrorBody {
  error: {
    code: PublicErrorCode;
    message: string;
  };
}

export interface Failure {
  readonly statusCode: number;
  readonly body: ErrorBody;
  readonly logDetail: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly stack?: string;
}

export function statusFor(code: PublicErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function toErrorResponse(error: unknown): Failure {
  if (error instanceof RouteError) {
    return {
      statusCode: statusFor(error.code),
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      logDetail: error.message,
      // RFC 9110: un 405 lista los métodos que el recurso sí acepta.
      ...(error.code === 'METHOD_NOT_ALLOWED' ? { headers: { Allow: WEATHER_METHODS.join(', ') } } : {}),
    };
  }

  if (error instanceof AppError) {
    return {
      statusCode: statusFor(error.code),
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      logDetail: error.logDetail,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: INTERNAL_ERROR_MESSAGE,
        },
      },
      logDetail: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: INTERNAL_ERROR_MESSAGE,
      },
    },
    logDetail: `Non-error thrown (${typeof error})`,
  };
}
