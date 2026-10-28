import { describe, expect, it } from 'vitest';
import { INTERNAL_ERROR_MESSAGE, InvalidRequestError } from '../../../src/domain/errors';
import { PUBLIC_ERROR_CODES, statusFor, toErrorResponse } from '../../../src/interfaces/http/failure';
import { RouteError } from '../../../src/interfaces/http/route';

describe('HTTP error mapping', () => {
  it.each([
    ['INVALID_REQUEST', 400],
    ['CITY_NOT_FOUND', 404],
    ['NOT_FOUND', 404],
    ['METHOD_NOT_ALLOWED', 405],
    ['UPSTREAM_ERROR', 502],
    ['INTERNAL_ERROR', 500],
  ] as const)('maps %s to HTTP %s', (code, status) => {
    expect(statusFor(code)).toBe(status);
  });

  it('covers every public error code', () => {
    expect(PUBLIC_ERROR_CODES).toEqual([
      'INVALID_REQUEST',
      'CITY_NOT_FOUND',
      'UPSTREAM_ERROR',
      'INTERNAL_ERROR',
      'NOT_FOUND',
      'METHOD_NOT_ALLOWED',
    ]);
  });

  it('lists the allowed methods on a 405 and nothing extra on a 404', () => {
    const notAllowed = toErrorResponse(new RouteError('METHOD_NOT_ALLOWED', 'Método no permitido.'));
    const notFound = toErrorResponse(new RouteError('NOT_FOUND', 'La ruta no existe.'));

    expect(notAllowed).toMatchObject({
      statusCode: 405,
      headers: { Allow: 'GET' },
      body: { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } },
    });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.headers).toBeUndefined();
  });

  it('hides the stack and the internal message of an unexpected error', () => {
    const failure = toErrorResponse(new Error('database password=secret'));

    expect(failure.statusCode).toBe(500);
    expect(failure.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE },
    });
    expect(JSON.stringify(failure.body)).not.toContain('secret');
    expect(JSON.stringify(failure.body)).not.toContain('stack');
    expect(failure.stack).toContain('password=secret');
    expect(failure.logDetail).toContain('password=secret');
  });

  it('passes an application error message through unchanged', () => {
    const failure = toErrorResponse(new InvalidRequestError('mensaje estable'));

    expect(failure).toMatchObject({
      statusCode: 400,
      body: { error: { code: 'INVALID_REQUEST', message: 'mensaje estable' } },
    });
    expect(failure.stack).toBeUndefined();
  });

  it('does not reflect a thrown non-error value', () => {
    const failure = toErrorResponse('super-secret');

    expect(JSON.stringify(failure.body)).not.toContain('super-secret');
    expect(failure.logDetail).toBe('Non-error thrown (string)');
  });
});
