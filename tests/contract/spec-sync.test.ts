import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '../../src/domain/errors';

const root = process.cwd();
const template = readFileSync(path.join(root, 'template.yaml'), 'utf8');
const openapi = readFileSync(path.join(root, 'openapi.yaml'), 'utf8');

describe('published contract', () => {
  it('declares GET /weather in SAM and in OpenAPI', () => {
    expect(template).toMatch(/Path:\s*\/weather/);
    expect(template).toMatch(/Method:\s*get/);
    expect(template).toContain('nodejs22.x');
    expect(template).toContain('arm64');
    expect(openapi).toContain('/weather:');
    expect(openapi).toMatch(/\n\s+get:/);
  });

  it('answers API Gateway errors with the same error envelope', () => {
    for (const type of ['MISSING_AUTHENTICATION_TOKEN', 'DEFAULT_4XX', 'DEFAULT_5XX']) {
      expect(template).toMatch(new RegExp(`\\n\\s+${type}:\\n`));
    }

    const bodies = [...template.matchAll(/application\/json: '(.+)'/g)].map(
      (match) => JSON.parse(match[1] ?? '') as { error: { code: string; message: string } },
    );
    expect(bodies).toHaveLength(3);
    for (const body of bodies) {
      expect(Object.keys(body)).toEqual(['error']);
      expect(ERROR_CODES).toContain(body.error.code);
      expect(body.error.message).not.toBe('');
    }
  });

  it('documents every error code from the assignment', () => {
    for (const code of ['INVALID_REQUEST', 'CITY_NOT_FOUND', 'UPSTREAM_ERROR', 'INTERNAL_ERROR']) {
      expect(openapi).toContain(code);
    }
  });
});
