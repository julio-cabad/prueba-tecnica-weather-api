import type { APIGatewayProxyResult } from 'aws-lambda';

export function json(statusCode: number, body: unknown, requestId: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
    body: JSON.stringify(body),
  };
}
