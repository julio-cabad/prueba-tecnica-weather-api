import { describe, expect, it } from 'vitest';
import { ERROR_CODES, INTERNAL_ERROR_MESSAGE, InvalidRequestError } from '../../../src/domain/errors';
import { statusFor, toErrorResponse } from '../../../src/interfaces/http/failure';

describe('HTTP error mapping', () => {
  it.each([
    ['INVALID_REQUEST', 400],
    ['CITY_NOT_FOUND', 404],
    ['UPSTREAM_ERROR', 502],
    ['INTERNAL_ERROR', 500],
  ] as const)('maps %s to HTTP %s', (code, status) => {
    expect(statusFor(code)).toBe(status);
  });

  it('covers every public error code', () => {
    expect(ERROR_CODES).toEqual([
      'INVALID_REQUEST',
      'CITY_NOT_FOUND',
      'UPSTREAM_ERROR',
      'INTERNAL_ERROR',
    ]);
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
