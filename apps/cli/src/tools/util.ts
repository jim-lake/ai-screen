/* eslint-disable @typescript-eslint/no-unsafe-function-type */

export default { hasCode, isCode };

export type Require<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = T extends Function
  ? T
  : T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

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
