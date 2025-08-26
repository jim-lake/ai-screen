import { useCallback, useSyncExternalStore } from 'react';
import EventEmitter from 'events';

import Api from '../tools/api';
import { deepEqual, herd } from '../tools/util';
import { errorLog } from '../tools/log';

import type { JSONObject, JSONValue, SettingsJson } from '@ai-screen/shared';

let g_settings: JSONObject = {};

const g_eventEmitter = new EventEmitter();
const CHANGE_EVENT = 'change';
function _emit(reason: string) {
  g_eventEmitter.emit(CHANGE_EVENT, reason);
}
function _subscribe(callback: (reason: string) => void) {
  g_eventEmitter.on(CHANGE_EVENT, callback);
  return () => {
    g_eventEmitter.removeListener(CHANGE_EVENT, callback);
  };
}
export async function init() {
  return fetch();
}
export function useSetting(key: string, type: 'string'): string | undefined;
export function useSetting(key: string, type: 'number'): number | undefined;
export function useSetting<T = JSONValue>(
  key: string,
  type: 'string' | 'number'
): T | undefined {
  const _get = useCallback(() => {
    return typeof g_settings[key] === type ? (g_settings[key] as T) : undefined;
  }, [key, type]);
  return useSyncExternalStore(_subscribe, _get);
}
export const fetch = herd(async (): Promise<Error | null> => {
  const opts = { url: `/api/1/settings/web` };
  const res = await Api.get<SettingsJson>(opts);
  if (res.err) {
    errorLog('SettingStore.fetch: err:', res.err, res.body);
  } else {
    if (!deepEqual(g_settings, res.body.settings)) {
      g_settings = res.body.settings;
      _emit('fetch');
    }
  }
  return res.err;
});
export async function saveSettings(obj: JSONObject): Promise<Error | null> {
  const opts = { url: '/api/1/settings/web', body: { obj } };
  const res = await Api.post(opts);
  if (res.err) {
    errorLog('SettingStore.saveSettings: err:', res.err, res.body);
  } else {
    g_settings = Object.assign({}, g_settings, obj);
    _emit('save');
  }
  return res.err;
}
export default { init, useSetting, fetch, saveSettings };
