import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { GetCurrentWeather } from '../../application/get-current-weather';
import type { Logger } from '../../application/logger';
import { toErrorResponse } from './failure';
import { resolveRequestId } from './request-id';
import { json } from './response';

export interface HandlerDependencies {
  readonly getCurrentWeather: GetCurrentWeather;
  readonly loggerFor: (requestId: string) => Logger;
}

export function createHandler(deps: HandlerDependencies) {
  return async function handler(
    event: APIGatewayProxyEvent,
    context: Context,
  ): Promise<APIGatewayProxyResult> {
    const requestId = resolveRequestId(event, context);
    const logger = deps.loggerFor(requestId);
    const started = Date.now();
    // API Gateway y Lambda usan ids distintos. sam local reutiliza el del gateway.
    const lambdaRequestId =
      context.awsRequestId && context.awsRequestId !== requestId ? context.awsRequestId : undefined;

    try {
      logger.info('request.received', {
        method: event.httpMethod,
        path: event.path,
        lambdaRequestId,
      });

      const report = await deps.getCurrentWeather(readRawCity(event), { logger });
      const statusCode = 200;
      logger.info('request.completed', {
        statusCode,
        durationMs: Date.now() - started,
        lambdaRequestId,
      });
      return json(statusCode, report, requestId);
    } catch (error) {
      const failure = toErrorResponse(error);
      const fields = {
        statusCode: failure.statusCode,
        code: failure.body.error.code,
        durationMs: Date.now() - started,
        detail: failure.logDetail,
        lambdaRequestId,
        ...(failure.stack ? { stack: failure.stack } : {}),
      };

      if (failure.statusCode >= 500) {
        logger.error('request.failed', fields);
      } else {
        logger.warn('request.failed', fields);
      }

      return json(failure.statusCode, failure.body, requestId);
    }
  };
}

function readRawCity(event: APIGatewayProxyEvent): string {
  const city = event.queryStringParameters?.city;
  return typeof city === 'string' ? city : '';
}
