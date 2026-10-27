import { describe, expect, it } from 'vitest';
import { MAX_CITY_LENGTH, parseCityQuery } from '../../src/domain/city-query';
import { InvalidRequestError } from '../../src/domain/errors';

describe('parseCityQuery', () => {
  it('trims and normalizes a usable city name', () => {
    expect(parseCityQuery('  Bogotá  ')).toBe('Bogotá');
    expect(parseCityQuery('New York')).toBe('New York');
    expect(parseCityQuery("St. John's")).toBe("St. John's");
  });

  it('accepts the length boundaries', () => {
    expect(parseCityQuery('Bo')).toBe('Bo');
    expect(parseCityQuery('a'.repeat(MAX_CITY_LENGTH))).toHaveLength(MAX_CITY_LENGTH);
  });

  it.each(['', ' ', 'a', '  b  '])('rejects %j', (input) => {
    expect(() => parseCityQuery(input)).toThrow(InvalidRequestError);
    expect(() => parseCityQuery(input)).toThrow(/al menos 2 caracteres/);
  });

  it('rejects an oversized name before it can be echoed into a log or a URL', () => {
    expect(() => parseCityQuery('a'.repeat(MAX_CITY_LENGTH + 1))).toThrow(/no puede superar 100/);
  });

  it('rejects control characters', () => {
    expect(() => parseCityQuery('Bo\ngota')).toThrow(/no válidos/);
  });
});
