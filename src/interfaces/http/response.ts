import type { APIGatewayProxyResult } from 'aws-lambda';

/** Los headers extra van primero para que no puedan pisar los del contrato. */
export function json(
  statusCode: number,
  body: unknown,
  requestId: string,
  headers: Readonly<Record<string, string>> = {},
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
    body: JSON.stringify(body),
  };
}
