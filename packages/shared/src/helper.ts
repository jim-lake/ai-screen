// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DeepPartial<T> = T extends Function
  ? T
  : T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
