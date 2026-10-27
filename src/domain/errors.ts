export const ERROR_CODES = [
  'INVALID_REQUEST',
  'CITY_NOT_FOUND',
  'UPSTREAM_ERROR',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const INTERNAL_ERROR_MESSAGE = 'Ocurrió un error interno.';
export const UPSTREAM_ERROR_MESSAGE = 'No fue posible obtener el clima en este momento.';

/**
 * Error de aplicación. `message` es lo que ve el cliente.
 * `logDetail` puede nombrar la causa y nunca sale en la respuesta HTTP.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly logDetail: string;

  constructor(
    code: ErrorCode,
    clientMessage: string,
    logDetail?: string,
    options?: { cause?: unknown },
  ) {
    super(clientMessage, options);
    this.name = new.target.name;
    this.code = code;
    this.logDetail = logDetail ?? clientMessage;
  }
}

export class InvalidRequestError extends AppError {
  constructor(clientMessage: string) {
    super('INVALID_REQUEST', clientMessage);
  }
}

export class CityNotFoundError extends AppError {
  constructor(city: string) {
    super('CITY_NOT_FOUND', `No se encontró la ciudad '${city}'`);
  }
}

export class UpstreamError extends AppError {
  constructor(logDetail: string, options?: { cause?: unknown }) {
    super('UPSTREAM_ERROR', UPSTREAM_ERROR_MESSAGE, logDetail, options);
  }
}

export class ConfigError extends AppError {
  constructor(key: string) {
    super('INTERNAL_ERROR', INTERNAL_ERROR_MESSAGE, `Invalid configuration: ${key}`);
  }
}
