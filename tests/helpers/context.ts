import type { Logger } from '../../src/application/logger';
import type { RequestContext } from '../../src/application/request-context';
import { noopLogger } from './logger';

/** Contexto de petición con un presupuesto que no se agota durante el test. */
export function testContext(logger: Logger = noopLogger()): RequestContext {
  return { logger, signal: new AbortController().signal };
}
