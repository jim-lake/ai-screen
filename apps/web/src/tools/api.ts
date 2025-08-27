import util from './util';
import Storage from './storage';
import { log, errorLog } from './log';

export class ApiError extends Error {
  constructor(
    public code: string | number,
    public cause?: Error
  ) {
    super(`API error ${code}`, { cause });
    this.name = 'ApiError';
  }
}
export default {
  ApiError,
  init,
  isReady,
  getCustomBaseUrl,
  setCustomBaseUrl,
  getBaseUrl,
  get,
  post,
  put,
  del,
  request,
  createWebSocket,
};
export type ApiResponse<T = unknown, U = T> =
  | {
      err: null;
      status: number;
      body: T;
      text?: string;
      headers: Record<string, string | undefined>;
    }
  | {
      err: ApiError;
      status: number;
      body: U | null;
      text?: string;
      headers?: Record<string, string | undefined>;
    };

class RetryError<T, U = T> extends Error {
  constructor(public result: ApiResponse<T, U>) {
    super('retry');
    this.name = 'RetryError';
  }
}

const DEFAULT_TIMEOUT = 10 * 1000;
const CUSTOM_BASE_URL_KEY = 'AI_SCREEN_CUSTOM_BASE_URL';

const DEV_BASE_URL = 'http://localhost:6847';
const PROD_BASE_URL = 'http://localhost:6847';

let g_baseUrl = '';
let g_customBaseUrl = '';

export async function init() {
  const env = util.getEnvironment();
  if (env === 'dev') {
    g_baseUrl = DEV_BASE_URL;
    log('Api.init: set dev urls:', g_baseUrl);
  } else {
    g_baseUrl = PROD_BASE_URL;
  }

  const res = await Storage.getItem<string>(CUSTOM_BASE_URL_KEY);
  if (!res.err && res.value) {
    log('Api.init: custom base url:', res.value);
    g_customBaseUrl = res.value;
  }
}
export function isReady(): boolean {
  return true;
}
export function getCustomBaseUrl(): string {
  return g_customBaseUrl;
}
export function setCustomBaseUrl(url?: string): void {
  if (!url) {
    g_customBaseUrl = '';
  } else {
    url = url.replace(/\/*$/, '');
    g_customBaseUrl = url;
  }
  void Storage.setItem({ key: CUSTOM_BASE_URL_KEY, value: g_customBaseUrl });
}
if (typeof window !== 'undefined') {
  (
    window as {
      getCustomBaseUrl?: typeof getCustomBaseUrl;
      setCustomBaseUrl?: typeof setCustomBaseUrl;
    }
  ).getCustomBaseUrl = getCustomBaseUrl;
  (
    window as {
      getCustomBaseUrl?: typeof getCustomBaseUrl;
      setCustomBaseUrl?: typeof setCustomBaseUrl;
    }
  ).setCustomBaseUrl = setCustomBaseUrl;
}
export function getBaseUrl(): string {
  return g_customBaseUrl ? g_customBaseUrl : g_baseUrl;
}
export interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string | string[]>;
  body?: Blob | FormData | object;
  query?: Record<string, string>;
  retry?: boolean;
  retryTimes?: number;
  timeout?: number;
  trackProgress?: (progress: number) => void;
}
export async function get<T, U = T>(params: RequestOptions) {
  params.method = 'GET';
  return request<T, U>(params);
}
export async function post<T, U = T>(params: RequestOptions) {
  params.method = 'POST';
  return request<T, U>(params);
}
export async function put<T, U = T>(params: RequestOptions) {
  params.method = 'PUT';
  return request<T, U>(params);
}
export async function del<T, U = T>(params: RequestOptions) {
  params.method = 'DELETE';
  return request<T, U>(params);
}
export async function request<T, U = T>(
  params: RequestOptions
): Promise<ApiResponse<T, U>> {
  if (!params.url.startsWith('http')) {
    params.url = getBaseUrl() + params.url;
  }
  if (params.retry) {
    return _requestRetry(params);
  } else {
    return _rawRequest(params);
  }
}
async function _requestRetry<T, U>(
  params: RequestOptions
): Promise<ApiResponse<T, U>> {
  try {
    return await util.retry(
      async () => {
        const res = await _rawRequest<T, U>(params);
        if (res.status <= 0 || res.status > 500) {
          throw new RetryError<T, U>(res);
        }
        return res;
      },
      { times: params.retryTimes ?? 5 }
    );
  } catch (e: unknown) {
    if (e instanceof RetryError) {
      return e.result;
    } else {
      return { err: new ApiError('retry'), status: 0, body: null };
    }
  }
}
async function _rawRequest<T, U>(
  params: RequestOptions
): Promise<ApiResponse<T, U>> {
  const { trackProgress } = params;
  const timeout = params.timeout ?? DEFAULT_TIMEOUT;

  const default_headers: Record<string, string> = {
    accept: 'application/json',
  };
  let body: FormData | Blob | string | null = null;
  if (params.body instanceof FormData) {
    body = params.body;
  } else if (params.body instanceof Blob) {
    body = params.body;
  } else if (params.body) {
    body = JSON.stringify(params.body);
    default_headers['content-type'] = 'application/json';
  }

  let { url } = params;
  if (params.query) {
    const list: string[] = [];
    for (const [k, v] of Object.entries(params.query)) {
      list.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
    const query_s = list.join('&');
    if (query_s.length > 0) {
      if (url.indexOf('?') > 0) {
        url += '&' + query_s;
      } else {
        url += '?' + query_s;
      }
    }
  }

  const headers = Object.assign({}, default_headers, params.headers);
  const fetchOptions: RequestInit = {
    method: params.method ?? 'GET',
    headers,
    body,
  };
  if (timeout > 0) {
    fetchOptions.signal = AbortSignal.timeout(timeout);
  }

  try {
    trackProgress?.(0);

    const response = await fetch(url, fetchOptions);
    const { status } = response;
    const response_headers: Record<string, string | undefined> = {};
    response.headers.forEach((value, key) => {
      response_headers[key.toLowerCase()] = value;
    });
    const is_json = response_headers['content-type']?.includes('json');
    const text = await response.text();
    trackProgress?.(100);
    let json: unknown = text;
    if (is_json) {
      try {
        json = JSON.parse(text);
      } catch {
        return {
          err: new ApiError('bad_json'),
          status,
          body: null,
          text,
          headers: response_headers,
        };
      }
    }

    if (status < 100 || status > 599) {
      return {
        err: new ApiError('bad_status_code'),
        status,
        body: json as U,
        text,
        headers: response_headers,
      };
    } else if (status > 399) {
      return {
        err: new ApiError(status),
        status,
        body: json as U,
        text,
        headers: response_headers,
      };
    }
    return {
      err: null,
      status,
      body: json as T,
      text,
      headers: response_headers,
    };
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return { err: new ApiError('timeout'), status: 0, body: null };
    }
    return {
      err: new ApiError(err.message, err),
      status: 0,
      body: null,
      headers: {},
    };
  }
}
export interface CreateWebSocketParams {
  path?: string;
  timeout?: number;
}
export function createWebSocket(
  params: CreateWebSocketParams
): Promise<WebSocket> {
  let url = getBaseUrl().replace('http', 'ws');
  if (params.path) {
    url += params.path;
  }
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const { signal } = controller;
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      controller.abort();
      ws.close();
      reject(new Error('timeout'));
    }, params.timeout ?? DEFAULT_TIMEOUT);
    function _onError(ev: Event) {
      errorLog('createWebSocket._onError: ev:', ev);
      controller.abort();
      clearTimeout(timeout);
      reject(new Error('error'));
    }
    function _onOpen() {
      controller.abort();
      clearTimeout(timeout);
      resolve(ws);
    }
    function _onClose(): void {
      controller.abort();
      clearTimeout(timeout);
      reject(new Error('closed'));
    }
    ws.addEventListener('error', _onError, { signal });
    ws.addEventListener('open', _onOpen, { signal });
    ws.addEventListener('close', _onClose, { signal });
  });
}
