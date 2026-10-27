import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

export function apiEvent(options?: {
  city?: string;
  requestId?: string;
  headers?: Record<string, string>;
}): APIGatewayProxyEvent {
  const queryStringParameters =
    options && 'city' in options && options.city !== undefined ? { city: options.city } : null;

  return {
    body: null,
    headers: options?.headers ?? {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/weather',
    pathParameters: null,
    queryStringParameters,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '/weather',
    requestContext: {
      accountId: '123456789012',
      apiId: 'local',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/weather',
      stage: 'Prod',
      requestTimeEpoch: 0,
      resourceId: 'weather',
      resourcePath: '/weather',
      requestId: options?.requestId ?? 'req-123',
      authorizer: undefined,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'vitest',
        userArn: null,
      },
    },
  };
}

export function lambdaContext(awsRequestId = 'aws-req-123'): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'weather-get-current',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:weather-get-current',
    memoryLimitInMB: '256',
    awsRequestId,
    logGroupName: '/aws/lambda/weather-get-current',
    logStreamName: 'local',
    getRemainingTimeInMillis: () => 15_000,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  };
}
