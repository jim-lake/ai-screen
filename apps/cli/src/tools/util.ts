
export default { jsonParse };

type Jsonify<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [K in keyof T]: T[K] extends Function
    ? never
    : T[K] extends object
      ? Jsonify<T[K]>
      : T[K];
};

type RemoveNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonClass<T extends abstract new (...args: any) => any> =
  RemoveNever<Jsonify<InstanceType<T>>>;


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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function jsonParse<T extends JSONValue = JSONObject>(json_obj: string): T|undefined {
  try {
    return JSON.parse(json_obj) as T;
  } catch {
    return undefined;
  }
}
