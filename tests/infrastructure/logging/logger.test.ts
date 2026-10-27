import { describe, expect, it } from 'vitest';
import { captureLogger } from '../../helpers/logger';

describe('createLogger', () => {
  it('writes one JSON line with level, message and requestId', () => {
    const logs = captureLogger('info', 'req-abc');

    logs.logger.info('request.completed', { statusCode: 200 });

    expect(logs.lines).toHaveLength(1);
    expect(logs.lines[0]).not.toContain('\n');
    expect(logs.entries()[0]).toMatchObject({
      level: 'info',
      message: 'request.completed',
      requestId: 'req-abc',
      statusCode: 200,
    });
    expect(logs.entries()[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('drops events below the configured level', () => {
    const logs = captureLogger('warn');

    logs.logger.info('ignored');
    logs.logger.error('kept');

    expect(logs.entries().map((entry) => entry.message)).toEqual(['kept']);
  });

  it('does not let extra fields overwrite the required ones', () => {
    const logs = captureLogger('info', 'req-fixed');

    logs.logger.info('real-message', { level: 'debug', message: 'nope', requestId: 'other' });

    expect(logs.entries()[0]).toMatchObject({
      level: 'info',
      message: 'real-message',
      requestId: 'req-fixed',
    });
  });

  it('omits undefined fields', () => {
    const logs = captureLogger('debug');

    logs.logger.debug('partial', { city: undefined, country: 'Colombia' });

    expect(logs.entries()[0]).not.toHaveProperty('city');
    expect(logs.entries()[0]?.country).toBe('Colombia');
  });
});
