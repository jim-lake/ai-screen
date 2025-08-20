import { useState, useRef, useCallback } from 'react';
import { DateTime } from 'luxon';

export default {
  noop,
  getEnvironment,
  getVersion,
  shallowEqual,
  deepEqual,
  deepClone,
  preventDefault,
  stopPropagation,
  stopAll,
  jsonParse,
  herd,
  herdOnce,
  canonicalJson,
  shuffle,
  useBusy,
  delay,
  retry,
  parallel,
  dateFormat,
  relativeDate,
};

export function noop(): void {
  /* intentionally empty */
}
export function getEnvironment(): 'prod' | 'dev' {
  let environment: 'prod' | 'dev' = 'prod';
  if (window.location.href) {
    if (/:\d+(?:\/|$)/.test(window.location.href)) {
      environment = 'dev';
    }
  }
  return environment;
}
export function getVersion(): string {
  return window.__VERSION__ ?? 'dev';
}
export function shallowEqual(objA: unknown, objB: unknown) {
  if (objA === objB) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  // Test for A's keys different from B.
  const bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
  for (const key of keysA) {
    if (
      !bHasOwnProperty(key) ||
      (objA as Record<string, unknown>)[key] !==
        (objB as Record<string, unknown>)[key]
    ) {
      return false;
    }
  }
  return true;
}
export function deepEqual(x: unknown, y: unknown) {
  if (x === y) {
    return true;
  } else if (x === null || y === null) {
    return false;
  } else {
    if (typeof x === 'object' && typeof y === 'object') {
      for (const p in x) {
        if (Object.prototype.hasOwnProperty.call(x, p)) {
          if (!Object.prototype.hasOwnProperty.call(y, p)) {
            return false;
          } else if (
            !deepEqual(
              (x as Record<string, unknown>)[p],
              (y as Record<string, unknown>)[p]
            )
          ) {
            return false;
          }
        }
      }

      for (const p in y) {
        if (
          Object.prototype.hasOwnProperty.call(y, p) &&
          !Object.prototype.hasOwnProperty.call(x, p)
        ) {
          return false;
        }
      }
    } else {
      return false;
    }
    return true;
  }
}
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
export function stopPropagation(e: { stopPropagation?: () => void }) {
  e.stopPropagation?.();
}
export function preventDefault(e: { preventDefault?: () => void }) {
  e.preventDefault?.();
}
export function stopAll(e: {
  stopPropagation?: () => void;
  preventDefault?: () => void;
}) {
  stopPropagation(e);
  preventDefault(e);
}
export function jsonParse(s: string): unknown {
  let ret: unknown;
  try {
    ret = JSON.parse(s);
  } catch {
    // noop
  }
  return ret;
}
export type HerdFunction<T extends unknown[], S, A extends boolean> = ((
  ...args: T
) => Promise<S>) &
  (A extends true
    ? { isRunning(...args: T): Promise<boolean> }
    : { isRunning(...args: T): boolean });

export function herd<T extends unknown[], S>(
  func: (...args: T) => Promise<S>,
  tagFunc: (...args: T) => string
): HerdFunction<T, S, false>;
export function herd<T extends unknown[], S>(
  func: (...args: T) => Promise<S>,
  tagFunc?: (...args: T) => Promise<string>
): HerdFunction<T, S, true>;
export function herd<T extends unknown[], S>(
  func: (...args: T) => Promise<S>,
  tagFunc?: (...args: T) => Promise<string> | string
): HerdFunction<T, S, boolean> {
  const promise_map = new Map<string, Promise<S>>();
  const wrapped = async (...args: T) => {
    const key = (await tagFunc?.(...args)) ?? '';
    let promise = promise_map.get(key);
    if (promise) {
      return promise;
    } else {
      promise = func(...args);
      promise_map.set(key, promise);
      try {
        return await promise;
      } finally {
        promise_map.delete(key);
      }
    }
  };
  wrapped.isRunning = (...args: T): Promise<boolean> | boolean => {
    const key_p = tagFunc?.(...args) ?? '';
    if (key_p instanceof Promise) {
      return key_p.then((key) => promise_map.has(key));
    } else {
      return promise_map.has(key_p);
    }
  };
  return wrapped as HerdFunction<T, S, boolean>;
}
export function herdOnce<T extends unknown[], S>(
  func: (...args: T) => Promise<S>
): (...args: T) => Promise<S> {
  let promise: Promise<S> | undefined;
  const wrapped = async (...args: T): Promise<S> => {
    promise ??= func(...args);
    return promise;
  };
  return wrapped;
}
function _canonicalObject(input: unknown): unknown {
  let output: unknown;
  if (Array.isArray(input)) {
    output = input.map(_canonicalObject);
  } else if (input && typeof input === 'object') {
    output = {};
    const keys = Object.keys(input).sort();
    keys.forEach(
      (k) =>
        ((output as Record<string, unknown>)[k] = _canonicalObject(
          (input as Record<string, unknown>)[k]
        ))
    );
  } else {
    output = input;
  }
  return output;
}
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(_canonicalObject(obj), null, '');
}
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
  return array;
}
export function useBusy(
  defaultValue = false
): [boolean, () => boolean, () => void, () => boolean] {
  const [isStateBusy, setIsStateBusy] = useState(defaultValue);
  const busyRef = useRef(defaultValue);

  const setBusy = useCallback(() => {
    if (!busyRef.current) {
      busyRef.current = true;
      setIsStateBusy(true);
      return true;
    }
    return false;
  }, []);

  const clearBusy = useCallback(() => {
    busyRef.current = false;
    setIsStateBusy(false);
  }, []);

  const isBusy = useCallback(() => busyRef.current, []);

  return [isStateBusy, setBusy, clearBusy, isBusy];
}
async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      reject(new Error('Operation aborted'));
    }

    if (signal?.aborted) {
      clearTimeout(timeout);
      reject(new Error('Operation aborted'));
    } else if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
const MAX_RETRY_INTERVAL = 60 * 1000;
function _defaultInterval(count: number): number {
  const base = Math.min(50 * Math.pow(3, count), MAX_RETRY_INTERVAL);
  return base + Math.floor(Math.random() * 20);
}
export async function retry<T>(
  func: (signal?: AbortSignal) => Promise<T>,
  params?: {
    times?: number;
    interval?: (count: number) => number;
    signal?: AbortSignal;
  }
): Promise<T> {
  const times = params?.times ?? 5;
  const interval = params?.interval ?? _defaultInterval;
  const signal = params?.signal;

  if (signal?.aborted) {
    throw new Error('Operation aborted');
  }
  let count = 0;
  for (;;) {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }
    try {
      return await func(signal);
    } catch (err) {
      if (++count >= times) {
        throw err;
      }
      await delay(interval(count), signal);
    }
  }
}
export function parallel<T extends readonly (() => Promise<unknown>)[]>(
  ...funcs: T
): Promise<{ [K in keyof T]: T[K] extends () => Promise<infer R> ? R : never }>;
export function parallel<T extends readonly (() => Promise<unknown>)[]>(
  funcs: T
): Promise<{ [K in keyof T]: T[K] extends () => Promise<infer R> ? R : never }>;
export function parallel<T extends readonly (() => Promise<unknown>)[]>(
  ...args: [T] | T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const funcs = Array.isArray(args[0]) ? args[0] : args;
  const funcsArray = funcs as readonly T[number][];
  const promises = funcsArray.map((fn) => fn());
  return Promise.all(promises) as Promise<{
    [K in keyof T]: Awaited<ReturnType<T[K]>>;
  }>;
}
export function dateFormat(date_s: string, format?: string): string {
  let ret = '';
  const dt = DateTime.fromISO(date_s);
  if (dt.isValid) {
    ret = dt.toFormat(format ?? 'yyyy-MM-dd HH:mm:ss');
  }
  return ret;
}
export function relativeDate(date_s: string): string {
  let ret = date_s;
  const dt = DateTime.fromISO(date_s);
  if (dt.isValid) {
    ret = dt.toRelative();
  }
  return ret;
}
