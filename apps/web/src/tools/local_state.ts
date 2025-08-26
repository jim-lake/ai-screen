import { useState } from 'react';
import type { JSONObject } from '@ai-screen/shared';

type Setter<T> = (new_value: T) => void;

export function useLocalState<T>(
  key: string,
  default_value: T
): [T, Setter<T>] {
  const stored_value = localStorage[key] as string | undefined;
  const stored_default =
    stored_value !== undefined ? _jsonParse<T>(stored_value) : undefined;
  const [value, setter] = useState<T>(stored_default ?? default_value);
  return [
    value,
    (new_value: T) => {
      localStorage[key] = JSON.stringify(new_value);
      setter(new_value);
    },
  ];
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function _jsonParse<T = JSONObject>(json_obj: string): T | undefined {
  try {
    return JSON.parse(json_obj) as T;
  } catch {
    return undefined;
  }
}
