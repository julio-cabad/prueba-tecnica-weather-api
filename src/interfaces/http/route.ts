import type { APIGatewayProxyEvent } from 'aws-lambda';

/** El contrato expone un solo recurso con un solo método. */
const WEATHER_RESOURCE = '/weather';
export const WEATHER_METHODS = ['GET'] as const;

export type RouteErrorCode = 'NOT_FOUND' | 'METHOD_NOT_ALLOWED';

/**
 * Ruta o método fuera del contrato. API Gateway REST no distingue una ruta
 * inexistente de un método no soportado, así que le manda todo a la Lambda y
 * estas respuestas salen con el mismo sobre, X-Request-Id y log que el resto.
 */
export class RouteError extends Error {
  readonly code: RouteErrorCode;

  constructor(code: RouteErrorCode, message: string) {
    super(message);
    this.name = 'RouteError';
    this.code = code;
  }
}

/** `resource` es la ruta que eligió API Gateway: `/weather`, `/` o `/{proxy+}`. */
export function assertWeatherRoute(event: APIGatewayProxyEvent): void {
  if (event.resource !== WEATHER_RESOURCE) {
    throw new RouteError('NOT_FOUND', 'La ruta no existe. Usa GET /weather?city={ciudad}.');
  }

  if (!(WEATHER_METHODS as readonly string[]).includes(event.httpMethod)) {
    throw new RouteError('METHOD_NOT_ALLOWED', 'Método no permitido. Usa GET /weather?city={ciudad}.');
  }
}
