/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export default { jsonParse, hasCode, isCode };

type Jsonify<T> = T extends Date
  ? string
  : T extends Function
    ? never
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;
type RemoveNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonClass<T extends abstract new (...args: any) => any> =
  RemoveNever<Jsonify<InstanceType<T>>>;

export type JSONPrimitive = string | number | boolean | null | undefined;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function jsonParse<T = JSONObject>(json_obj: string): T | undefined {
  try {
    return JSON.parse(json_obj) as T;
  } catch {
    return undefined;
  }
}
export interface SystemError extends Error {
  code: string;
}
export function hasCode(e: unknown): e is SystemError {
  return (
    e instanceof Error && typeof (e as { code?: unknown }).code === 'string'
  );
}
export function isCode(e: unknown, code: string) {
  return hasCode(e) && e.code === code;
}
