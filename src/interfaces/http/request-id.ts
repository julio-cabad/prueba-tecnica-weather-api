import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { hasControlCharacter } from '../../domain/text';

const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Prefiere el id de API Gateway. El header del cliente solo se usa si la
 * plataforma no mandó uno, y se descarta si es enorme o tiene caracteres de control.
 */
export function resolveRequestId(event: APIGatewayProxyEvent, context: Context): string {
  return (
    usableId(event.requestContext?.requestId) ??
    usableId(header(event, 'x-request-id')) ??
    usableId(context.awsRequestId) ??
    randomUUID()
  );
}

function header(event: APIGatewayProxyEvent, name: string): string | undefined {
  const headers = event.headers;
  if (!headers) {
    return undefined;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name && typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}

function usableId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REQUEST_ID_LENGTH || hasControlCharacter(trimmed)) {
    return undefined;
  }

  return trimmed;
}
