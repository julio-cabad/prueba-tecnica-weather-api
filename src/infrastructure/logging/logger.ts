import type { LogFields, Logger } from '../../application/logger';
import { LEVEL_RANK, type LogLevel } from './log-level';

export interface LoggerOptions {
  readonly requestId: string;
  readonly level?: LogLevel;
  readonly sink?: (line: string) => void;
}

/** Una línea JSON por evento. Los campos fijos se escriben al final para que no se puedan pisar. */
export function createLogger(options: LoggerOptions): Logger {
  const minLevel = options.level ?? 'info';
  const sink = options.sink ?? ((line: string) => console.log(line));
  const requestId = options.requestId;

  const write = (level: LogLevel, message: string, fields?: LogFields): void => {
    if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) {
      return;
    }

    const entry = {
      ...stripUndefined(fields),
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId,
    };

    try {
      sink(JSON.stringify(entry));
    } catch {
      sink(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'log.serialization_failed',
          requestId,
        }),
      );
    }
  };

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}

function stripUndefined(fields: LogFields | undefined): Record<string, unknown> {
  if (!fields) {
    return {};
  }

  return Object.fromEntries(Object.entries(fields).filter((entry) => entry[1] !== undefined));
}
