import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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

  it('documents every error code from the assignment', () => {
    for (const code of ['INVALID_REQUEST', 'CITY_NOT_FOUND', 'UPSTREAM_ERROR', 'INTERNAL_ERROR']) {
      expect(openapi).toContain(code);
    }
  });
});
