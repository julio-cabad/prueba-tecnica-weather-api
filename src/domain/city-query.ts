import { InvalidRequestError } from './errors';
import { hasControlCharacter } from './text';

export const MIN_CITY_LENGTH = 2;
export const MAX_CITY_LENGTH = 100;

/**
 * Normaliza el texto del query param `city`.
 * El enunciado exige rechazar vacío y menos de 2 caracteres.
 * El tope y los caracteres de control evitan abusos sin impedir nombres reales
 * (espacios, guiones, apóstrofos y letras unicode).
 */
export function parseCityQuery(input: string): string {
  const city = input.normalize('NFC').trim();

  if (city.length < MIN_CITY_LENGTH) {
    throw new InvalidRequestError(
      "El parámetro 'city' es obligatorio y debe tener al menos 2 caracteres.",
    );
  }

  if (city.length > MAX_CITY_LENGTH) {
    throw new InvalidRequestError(
      `El parámetro 'city' no puede superar ${MAX_CITY_LENGTH} caracteres.`,
    );
  }

  if (hasControlCharacter(city)) {
    throw new InvalidRequestError("El parámetro 'city' contiene caracteres no válidos.");
  }

  return city;
}
