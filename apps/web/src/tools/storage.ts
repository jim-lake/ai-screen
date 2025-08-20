export default { getItem, setItem };

export interface StorageResult<T = unknown> {
  err: null | Error;
  value: T | undefined;
}
export function getItem<T = unknown>(key: string): Promise<StorageResult<T>> {
  let value: T | undefined;
  const found = window.localStorage[key] as string | undefined;
  if (found) {
    try {
      value = JSON.parse(found) as T;
    } catch {
      /* ignore */
    }
  }
  return Promise.resolve({ err: null, value });
}
export interface SetParams<T = unknown> {
  key: string;
  value?: T;
}
export function setItem<T = unknown>(params: SetParams<T>): Promise<void> {
  window.localStorage[params.key] = JSON.stringify(params.value);
  return Promise.resolve();
}
