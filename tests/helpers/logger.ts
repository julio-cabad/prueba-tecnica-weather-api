import type { Logger } from '../../src/application/logger';
import { createLogger } from '../../src/infrastructure/logging/logger';
import type { LogLevel } from '../../src/infrastructure/logging/log-level';

export function captureLogger(level: LogLevel = 'debug', requestId = 'req-test') {
  const lines: string[] = [];
  const logger = createLogger({
    requestId,
    level,
    sink: (line) => lines.push(line),
  });

  return {
    logger,
    lines,
    entries(): Array<Record<string, unknown>> {
      return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    },
  };
}

export function noopLogger(): Logger {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}
