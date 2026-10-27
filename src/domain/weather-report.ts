export interface Measurement {
  readonly value: number;
  readonly unit: string;
}

export interface CurrentConditions {
  readonly temperature: Measurement;
  readonly humidity: Measurement;
  readonly windSpeed: Measurement;
  readonly condition: string;
  readonly observedAt: string;
}

/** Ciudad ya resuelta por el geocoder. El nombre es el localizado, no el texto buscado. */
export interface GeocodedCity {
  readonly name: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
}

/** Contrato público de `GET /weather`. */
export interface WeatherReport {
  readonly city: string;
  readonly country: string;
  readonly coordinates: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly timezone: string;
  readonly current: CurrentConditions;
}
