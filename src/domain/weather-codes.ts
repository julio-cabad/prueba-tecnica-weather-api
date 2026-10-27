const UNKNOWN_CONDITION = 'Condición desconocida';

/**
 * Traduce un código WMO (Open-Meteo `weather_code`) a español.
 * El código 2 es "Parcialmente nublado": es el texto del contrato de ejemplo.
 */
export function describeWeatherCode(code: number): string {
  if (!Number.isInteger(code)) {
    return UNKNOWN_CONDITION;
  }

  switch (code) {
    case 0:
      return 'Despejado';
    case 1:
      return 'Mayormente despejado';
    case 2:
      return 'Parcialmente nublado';
    case 3:
      return 'Nublado';
    case 45:
    case 48:
      return 'Niebla';
    case 95:
    case 96:
    case 99:
      return 'Tormenta';
    default:
      break;
  }

  if (code >= 51 && code <= 57) {
    return 'Llovizna';
  }

  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return 'Lluvia';
  }

  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'Nieve';
  }

  return UNKNOWN_CONDITION;
}
