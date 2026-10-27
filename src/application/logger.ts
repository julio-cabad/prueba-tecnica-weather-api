export type LogFields = Readonly<Record<string, unknown>>;

/** Puerto de logging. La implementación concreta vive en infraestructura. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}
