import { describe, expect, it } from 'vitest';
import { json } from '../../../src/interfaces/http/response';

describe('json', () => {
  it('adds extra headers without letting them replace the contract headers', () => {
    const response = json(405, { ok: false }, 'req-1', {
      Allow: 'GET',
      'X-Request-Id': 'spoofed',
      'Content-Type': 'text/html',
    });

    expect(response.headers).toEqual({
      Allow: 'GET',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': 'req-1',
    });
    expect(response.body).toBe('{"ok":false}');
  });
});
