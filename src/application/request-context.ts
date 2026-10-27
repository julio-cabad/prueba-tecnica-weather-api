import type { Logger } from './logger';

export interface RequestContext {
  readonly logger: Logger;
}
