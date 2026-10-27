import type { Logger } from './logger';

export interface RequestContext {
  readonly logger: Logger;
  /**
   * Se aborta cuando la petición agota su presupuesto para Open-Meteo.
   * Geocoding y forecast comparten la misma señal: el límite de 5 s es por
   * petición, no por llamada.
   */
  readonly signal: AbortSignal;
}
