import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUBLIC_ERROR_CODES } from '../../src/interfaces/http/failure';

const root = process.cwd();
const template = readFileSync(path.join(root, 'template.yaml'), 'utf8');
const openapi = readFileSync(path.join(root, 'openapi.yaml'), 'utf8');

describe('published contract', () => {
  it('documents GET /weather and routes every path and method to the Lambda', () => {
    const routes = [...template.matchAll(/Path: (\S+)\n\s+Method: (\S+)/g)].map((m) => `${m[2]} ${m[1]}`);
    expect(routes).toEqual(['any /weather', 'any /', 'any /{proxy+}']);
    expect(template).toContain('nodejs22.x');
    expect(template).toMatch(/Architectures:\s*\n\s*- !Ref Architecture/);
    expect(template).toMatch(/Architecture:\s*\n\s*Type: String\s*\n\s*Default: x86_64/);
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
      expect(PUBLIC_ERROR_CODES).toContain(body.error.code);
      expect(body.error.message).not.toBe('');
    }
  });

  it('documents every public error code in OpenAPI', () => {
    for (const code of PUBLIC_ERROR_CODES) {
      expect(openapi).toMatch(new RegExp(`- ${code}\\n`));
    }
  });
});
