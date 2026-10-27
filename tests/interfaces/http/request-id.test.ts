import { describe, expect, it } from 'vitest';
import { resolveRequestId } from '../../../src/interfaces/http/request-id';
import { apiEvent, lambdaContext } from '../../helpers/events';

describe('resolveRequestId', () => {
  it('prefers the API Gateway request id', () => {
    const event = apiEvent({ requestId: 'gw-1', headers: { 'X-Request-Id': 'client-1' } });

    expect(resolveRequestId(event, lambdaContext('aws-1'))).toBe('gw-1');
  });

  it('falls back to the client header and then to the Lambda context', () => {
    const fromHeader = apiEvent({ requestId: '   ', headers: { 'x-request-id': 'client-9' } });
    expect(resolveRequestId(fromHeader, lambdaContext('aws-1'))).toBe('client-9');

    const fromContext = apiEvent({ requestId: '' });
    expect(resolveRequestId(fromContext, lambdaContext('aws-9'))).toBe('aws-9');
  });

  it('ignores an oversized or unsafe id', () => {
    const event = apiEvent({ requestId: 'x'.repeat(200), headers: { 'X-Request-Id': 'bad\nid' } });

    expect(resolveRequestId(event, lambdaContext('aws-safe'))).toBe('aws-safe');
  });
});
