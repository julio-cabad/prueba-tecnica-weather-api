import { describe, expect, it } from 'vitest';
import { describeWeatherCode } from '../../src/domain/weather-codes';

describe('describeWeatherCode', () => {
  it.each([
    [0, 'Despejado'],
    [1, 'Mayormente despejado'],
    [2, 'Parcialmente nublado'],
    [3, 'Nublado'],
    [45, 'Niebla'],
    [48, 'Niebla'],
    [51, 'Llovizna'],
    [53, 'Llovizna'],
    [55, 'Llovizna'],
    [56, 'Llovizna'],
    [57, 'Llovizna'],
    [61, 'Lluvia'],
    [63, 'Lluvia'],
    [65, 'Lluvia'],
    [66, 'Lluvia'],
    [67, 'Lluvia'],
    [80, 'Lluvia'],
    [81, 'Lluvia'],
    [82, 'Lluvia'],
    [71, 'Nieve'],
    [73, 'Nieve'],
    [75, 'Nieve'],
    [77, 'Nieve'],
    [85, 'Nieve'],
    [86, 'Nieve'],
    [95, 'Tormenta'],
    [96, 'Tormenta'],
    [99, 'Tormenta'],
    [4, 'Condición desconocida'],
    [50, 'Condición desconocida'],
    [83, 'Condición desconocida'],
    [100, 'Condición desconocida'],
  ])('maps WMO %s to %s', (code, label) => {
    expect(describeWeatherCode(code)).toBe(label);
  });

  it('uses the default for a non-integer code', () => {
    expect(describeWeatherCode(2.5)).toBe('Condición desconocida');
  });
});
