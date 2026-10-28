import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import type { HandlerDependencies } from './create-handler';
import { createHandler } from './create-handler';
import { createDependencies } from '../../composition/container';
import { createLogger } from '../../infrastructure/logging/logger';
import { toErrorResponse } from './failure';
import { resolveRequestId } from './request-id';
import { json } from './response';

export interface LambdaHandlerOptions {
  readonly resolveDependencies?: () => HandlerDependencies;
}

/**
 * Adapta el ciclo de vida de Lambda: la configuración se resuelve una vez
 * por entorno y un fallo de arranque sigue respondiendo con el sobre de error.
 */
export function createLambdaHandler(options: LambdaHandlerOptions = {}) {
  const resolve = options.resolveDependencies ?? (() => createDependencies());
  let cached: HandlerDependencies | undefined;

  return async function handler(
    event: APIGatewayProxyEvent,
    context: Context,
  ): Promise<APIGatewayProxyResult> {
    try {
      cached ??= resolve();
      return await createHandler(cached)(event, context);
    } catch (error) {
      const requestId = resolveRequestId(event, context);
      const logger = createLogger({ requestId, level: 'error' });
      const failure = toErrorResponse(error);
      logger.error('request.failed', {
        statusCode: failure.statusCode,
        code: failure.body.error.code,
        detail: failure.logDetail,
        ...(failure.stack ? { stack: failure.stack } : {}),
      });
      return json(failure.statusCode, failure.body, requestId, failure.headers);
    }
  };
}
