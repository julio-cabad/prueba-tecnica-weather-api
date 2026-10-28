import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INTERNAL_ERROR_MESSAGE } from '../../src/domain/errors';
import { PUBLIC_ERROR_CODES, statusFor, type PublicErrorCode } from '../../src/interfaces/http/failure';
import { ROUTE_NOT_FOUND_MESSAGE } from '../../src/interfaces/http/route';

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

  it('answers API Gateway errors with the envelope and the status of their code', () => {
    const responses = [
      ...template.matchAll(
        /\n\s+([A-Z0-9_]+):\n\s+StatusCode: "(\d{3})"\n\s+ResponseTemplates:\n\s+application\/json: '(.+)'/g,
      ),
    ].map((match) => ({
      type: match[1],
      status: Number(match[2]),
      body: JSON.parse(match[3] ?? '') as { error: { code: PublicErrorCode; message: string } },
    }));

    expect(responses.map((response) => response.type)).toEqual([
      'MISSING_AUTHENTICATION_TOKEN',
      'THROTTLED',
      'DEFAULT_4XX',
      'DEFAULT_5XX',
    ]);
    // Ningún gateway response queda sin StatusCode explícito.
    expect(template.match(/application\/json: '/g)).toHaveLength(responses.length);
    for (const { status, body } of responses) {
      expect(Object.keys(body)).toEqual(['error']);
      expect(PUBLIC_ERROR_CODES).toContain(body.error.code);
      expect(statusFor(body.error.code)).toBe(status);
      expect(body.error.message).not.toBe('');
    }

    const byType = new Map(responses.map((response) => [response.type, response.body.error.message]));
    expect(byType.get('MISSING_AUTHENTICATION_TOKEN')).toBe(ROUTE_NOT_FOUND_MESSAGE);
    expect(byType.get('DEFAULT_5XX')).toBe(INTERNAL_ERROR_MESSAGE);
  });

  it('documents every public error code in OpenAPI', () => {
    for (const code of PUBLIC_ERROR_CODES) {
      expect(openapi).toMatch(new RegExp(`- ${code}\\n`));
    }
  });
});
