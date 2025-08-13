import * as http from 'node:http';
import * as https from 'node:https';

export default { request, setBaseUrl };

const REQUEST_TIMEOUT = 2 * 1000;
const UAS = `ai-screen-cli/${globalThis.__VERSION__ ?? 'dev'}`;

let g_baseUrl = 'http://localhost:6847';

export class RequestError extends Error {
  public constructor(
    public code: string | number,
    public cause?: Error
  ) {
    super(`Request error ${code}`, { cause });
    this.name = 'RequestError';
  }
}
export function setBaseUrl(url: string) {
  g_baseUrl = url;
}
export type Response<T = unknown, U = T> =
  | {
      err: null;
      status: number;
      body: T | null;
      text?: string;
      headers: Record<string, string | undefined>;
    }
  | {
      err: RequestError;
      status: number;
      body: U | null;
      text?: string;
      headers?: Record<string, string | undefined>;
    };

export interface RequestParams {
  url: string;
  method?: string;
  headers?: Record<string, string | string[]>;
  body?: Buffer | string | object;
  query?: Record<string, string>;
  timeout?: number;
}
export async function request<T, U = T>(
  params: RequestParams
): Promise<Response<T, U>> {
  const url = params.url.startsWith('http')
    ? params.url
    : g_baseUrl + params.url;
  let post_body: Buffer | string | undefined;
  const request_headers = Object.assign({ 'User-Agent': UAS }, params.headers);
  if (typeof params.body === 'object') {
    request_headers['Content-Type'] ??= 'application/json';
    post_body = JSON.stringify(params.body);
  } else if (params.body !== undefined) {
    post_body = params.body;
  }
  return new Promise((resolve, reject) => {
    let text = '';
    let status = 0;
    const err_body: U | null = null;
    try {
      const opts: Parameters<typeof https.request>[1] = {
        headers: request_headers,
        timeout: params.timeout ?? REQUEST_TIMEOUT,
      };
      if (params.method) {
        opts.method = params.method;
      }
      const runner = url.startsWith('https') ? https : http;
      const response_headers: Record<string, string | undefined> = {};
      const req = runner.request(url, opts, (res) => {
        status = res.statusCode ?? 0;
        for (const key of Object.keys(res.headersDistinct)) {
          response_headers[key] = res.headersDistinct[key]?.[0];
        }
        res.on('data', (chunk: string) => {
          text += chunk;
        });
        res.on('end', () => {
          let success_body: T | null = null;
          let err: RequestError | null = null;
          if (res.headers['content-type']?.includes('json')) {
            try {
              success_body = JSON.parse(text) as T;
            } catch (e: unknown) {
              err = new RequestError('BAD_JSON_BODY', e as Error);
            }
          }
          if (!err && (status < 200 || status > 299)) {
            err = new RequestError(status);
          }
          if (err) {
            resolve({
              err,
              status,
              text,
              body: success_body as U,
              headers: response_headers,
            });
          } else {
            resolve({
              err,
              status,
              text,
              body: success_body,
              headers: response_headers,
            });
          }
        });
      });
      req.on('error', (e: RequestError) => {
        const err = e.code ? e : new RequestError('REQUEST_ERROR', e);
        resolve({
          err,
          status,
          text,
          body: err_body,
          headers: response_headers,
        });
      });
      if (post_body) {
        req.write(post_body);
      }
      req.end();
    } catch (err: unknown) {
      reject(err as Error);
    }
  });
}
