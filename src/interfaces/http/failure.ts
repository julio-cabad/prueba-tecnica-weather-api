import { AppError, INTERNAL_ERROR_MESSAGE, type ErrorCode } from '../../domain/errors';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  CITY_NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export interface Failure {
  readonly statusCode: number;
  readonly body: ErrorBody;
  readonly logDetail: string;
  readonly stack?: string;
}

export function statusFor(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function toErrorResponse(error: unknown): Failure {
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
