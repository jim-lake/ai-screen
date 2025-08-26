import type { Request, Response } from 'express';

export class HttpError extends Error {
  public constructor(
    public code: number,
    public body: string | object
  ) {
    super(typeof body === 'string' ? body : 'http_error');
  }
}
export default {
  HttpError,
  optionalProp,
  requiredProp,
  requiredBool,
  optionalBool,
  optionalObject,
  requiredObject,
  optionalArray,
  requiredArray,
  isTypeSpec,
};

type JsonPrimitive = string | number | boolean | null;

type JsonInput<T> = T extends (infer Item)[]
  ? (Item | { toJSON: () => Item })[]
  : T extends JsonPrimitive
    ? T
    : T extends object
      ? { [K in keyof T]: JsonInput<T[K]> } | { toJSON: () => T }
      : T;

type Send<ResBody = unknown, T = JsonResponse<ResBody>> = (
  body?: JsonInput<ResBody>
) => T;

export interface JsonResponse<ResBody = unknown>
  extends Omit<Response, 'send'> {
  send: Send<ResBody>;
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];
export type RequestJsonBody = Request<unknown, unknown, JSONObject | null>;

type DecrementDepth<D extends number> = D extends 10
  ? 9
  : D extends 9
    ? 8
    : D extends 8
      ? 7
      : D extends 7
        ? 6
        : D extends 6
          ? 5
          : D extends 5
            ? 4
            : D extends 4
              ? 3
              : D extends 3
                ? 2
                : D extends 2
                  ? 1
                  : D extends 1
                    ? 0
                    : 0;

type SpecToType<S, Depth extends number = 5> = Depth extends 0
  ? unknown
  : S extends string
    ? string
    : S extends number
      ? number
      : S extends boolean
        ? boolean
        : S extends (infer U)[]
          ? SpecToType<U, DecrementDepth<Depth>>[]
          : S extends object
            ? keyof S extends never
              ? Record<string, unknown>
              : Record<string, SpecToType<S[keyof S], DecrementDepth<Depth>>>
            : unknown;

export function isTypeSpec<S>(obj: unknown, spec: S): obj is SpecToType<S> {
  if (Array.isArray(spec)) {
    if (!Array.isArray(obj)) {
      return false;
    }
    if (spec.length > 0) {
      const sample: unknown = spec[0];
      for (const child of obj) {
        if (!isTypeSpec(child, sample)) {
          return false;
        }
      }
    }
    return true;
  }
  if (typeof spec === 'object' && spec !== null) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const values = Object.values(spec as Record<string, unknown>);
    if (values.length === 0) {
      return true;
    }

    const sample = values[0];
    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (!isTypeSpec(value, sample)) {
        return false;
      }
    }
    return true;
  }
  return typeof obj === typeof spec;
}

function _optionalProp<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string,
  type: 'string' | 'number' | undefined
): unknown;
function _optionalProp(
  req: RequestJsonBody,
  prop: string,
  type: 'string' | 'number' | undefined
): unknown {
  let v: unknown = req.body?.[prop] ?? req.query[prop];

  if (v !== undefined) {
    if (type !== undefined) {
      if (type === 'number' && typeof v === 'string') {
        const f = parseFloat(v);
        if (isNaN(f)) {
          throw new HttpError(400, `${prop} must be a ${type}`);
        }
        v = f;
      } else if (type === 'string' && typeof v === 'number') {
        v = String(v);
      }

      if (typeof v !== type) {
        throw new HttpError(400, `${prop} must be a ${type}`);
      }
    } else if (v && typeof v === 'object') {
      throw new HttpError(400, `${prop} not allowed to be an object`);
    }
  }
  return v;
}

export function optionalProp<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string,
  type: 'string'
): string | undefined;
export function optionalProp<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string,
  type: 'number'
): number | undefined;
export function optionalProp(req: Request, prop: string): unknown;
export function optionalProp(
  req: RequestJsonBody,
  prop: string,
  type?: 'string' | 'number'
) {
  return _optionalProp(req, prop, type);
}
export function requiredProp<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string,
  type: 'string'
): string;
export function requiredProp<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string,
  type: 'number'
): number;
export function requiredProp(req: Request, prop: string): unknown;
export function requiredProp(
  req: Request,
  prop: string,
  type?: 'string' | 'number'
) {
  const v = _optionalProp(req, prop, type);
  if (v === undefined) {
    throw new HttpError(400, `${prop} is required`);
  }
  return v;
}
export function optionalBool<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string
): boolean | undefined;
export function optionalBool(
  req: RequestJsonBody,
  prop: string,
  default_val?: boolean
): boolean | undefined {
  let ret: boolean | undefined;

  let v: unknown = req.body?.[prop] ?? req.query[prop];
  if (v !== undefined) {
    ret = !(
      v === false ||
      v === 0 ||
      v === null ||
      v === 'false' ||
      v === '0' ||
      v === 'null' ||
      v === ''
    );
  }
  if (v === undefined && default_val !== undefined) {
    v = default_val;
  }
  return ret;
}
export function requiredBool<S, T, U, V, W extends Record<string, unknown>>(
  req: Request<S, T, U, V, W>,
  prop: string
): boolean;
export function requiredBool(req: RequestJsonBody, prop: string): boolean {
  const val = optionalBool(req, prop);
  if (val === undefined) {
    throw new HttpError(400, `${prop} is required`);
  }
  return val;
}

export function optionalObject<
  S,
  T,
  U,
  V,
  W,
  X extends Record<string, unknown>,
>(
  req: Request<T, U, V, W, X>,
  prop: string,
  spec?: S
): SpecToType<S> | undefined;
export function optionalObject(
  req: RequestJsonBody,
  prop: string,
  spec?: unknown
): JSONObject | undefined {
  const v: unknown = req.body?.[prop];
  if (v === null || (v !== undefined && typeof v !== 'object')) {
    throw new HttpError(400, `${prop} must be an object`);
  }
  if (spec && v && !isTypeSpec(v, spec)) {
    throw new HttpError(
      400,
      `${prop} must be this type: ${JSON.stringify(spec)}`
    );
  }
  return v as JSONObject;
}

export function requiredObject<
  S,
  T,
  U,
  V,
  W,
  X extends Record<string, unknown>,
>(req: Request<T, U, V, W, X>, prop: string, spec?: S): SpecToType<S>;
export function requiredObject(
  req: RequestJsonBody,
  prop: string,
  spec?: unknown
): JSONObject {
  const v = optionalObject(req, prop, spec);
  if (v === undefined || v === null) {
    throw new HttpError(400, `${prop} is required`);
  }
  return v as JSONObject;
}

export function optionalArray<S, T, U, V, W, X extends Record<string, unknown>>(
  req: Request<T, U, V, W, X>,
  prop: string,
  spec: S
): SpecToType<S> | undefined;
export function optionalArray(
  req: RequestJsonBody,
  prop: string,
  spec: unknown
): unknown[] | undefined {
  let v: unknown = req.body?.[prop] ?? req.query[prop];
  if (typeof v === 'string') {
    v = v.split(',');
  }
  if (v !== undefined && !Array.isArray(v)) {
    throw new HttpError(400, `${prop} must be an array`);
  }
  if (spec && v && !isTypeSpec(v, spec)) {
    throw new HttpError(
      400,
      `${prop} must be this type: ${JSON.stringify(spec)}`
    );
  }
  return v;
}
export function requiredArray<S, T, U, V, W, X extends Record<string, unknown>>(
  req: Request<T, U, V, W, X>,
  prop: string,
  spec: S
): SpecToType<S>;
export function requiredArray(
  req: RequestJsonBody,
  prop: string,
  spec: unknown
): unknown[] {
  const v = optionalArray(req, prop, spec);
  if (v === undefined) {
    throw new HttpError(400, `${prop} is required`);
  }
  return v as unknown[];
}
