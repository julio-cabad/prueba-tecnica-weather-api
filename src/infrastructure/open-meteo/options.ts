import type { FetchLike } from '../http/get-json';

export interface OpenMeteoClientOptions {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly fetchImpl?: FetchLike;
}
