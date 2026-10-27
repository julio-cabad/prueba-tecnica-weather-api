import type { CurrentConditions, GeocodedCity } from '../domain/weather-report';
import type { RequestContext } from './request-context';

export interface Geocoder {
  search(name: string, ctx: RequestContext): Promise<GeocodedCity | null>;
}

export interface ForecastProvider {
  getCurrent(city: GeocodedCity, ctx: RequestContext): Promise<CurrentConditions>;
}
