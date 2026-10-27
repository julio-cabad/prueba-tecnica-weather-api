import { parseCityQuery } from '../domain/city-query';
import { CityNotFoundError } from '../domain/errors';
import type { WeatherReport } from '../domain/weather-report';
import type { ForecastProvider, Geocoder } from './ports';
import type { RequestContext } from './request-context';

export type GetCurrentWeather = (rawCity: string, ctx: RequestContext) => Promise<WeatherReport>;

export function createGetCurrentWeather(
  geocoder: Geocoder,
  forecast: ForecastProvider,
): GetCurrentWeather {
  return async (rawCity, ctx) => {
    const cityName = parseCityQuery(rawCity);
    ctx.logger.info('weather.lookup.started', { city: cityName });

    const city = await geocoder.search(cityName, ctx);
    if (!city) {
      throw new CityNotFoundError(cityName);
    }

    const current = await forecast.getCurrent(city, ctx);
    const report: WeatherReport = {
      city: city.name,
      country: city.country,
      coordinates: {
        latitude: city.latitude,
        longitude: city.longitude,
      },
      timezone: city.timezone,
      current,
    };

    ctx.logger.info('weather.lookup.completed', {
      city: report.city,
      country: report.country,
      timezone: report.timezone,
    });

    return report;
  };
}
