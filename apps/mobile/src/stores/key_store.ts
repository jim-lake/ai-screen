import { EventEmitter } from 'events';

import { useSyncExternalStore } from 'react';
import { RSAKeychain } from 'react-native-rsa-native';
import { v4 as uuid } from 'uuid';

import { errorLog } from '../tools/log';
import { deepEqual, herd } from '../tools/util';

import type { KeychainItem } from 'react-native-rsa-native';

export type KeyType = 'rsa' | 'ec' | 'ed';

let g_list: KeychainItem[] = [];

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
function _getList() {
  return g_list;
}
export function useList() {
  return useSyncExternalStore(_subscribe, _getList);
}
export const fetch = herd(async (): Promise<void> => {
  try {
    const list = await RSAKeychain.getAllKeys();
    if (!deepEqual(g_list, list)) {
      g_list = list;
      _emit('fetch');
    }
  } catch (err) {
    errorLog('KeyStore.fetch: err:', err);
  }
});
interface CreateKeyParams {
  label: string;
  type: KeyType;
  size: number;
  synchronized: boolean;
}
export async function createKey(
  params: CreateKeyParams
): Promise<Error | null> {
  const { label, type, size, synchronized } = params;
  try {
    if (type === 'ed') {
      const tag = `ed-${uuid()}`;
      await RSAKeychain.generateEd(tag, synchronized, label);
    } else if (type === 'ec') {
      const tag = `ec-${uuid()}`;
      await RSAKeychain.generateEC(tag, synchronized, label);
    } else {
      const tag = `rsa-${uuid()}`;
      await RSAKeychain.generateKeys(tag, size, synchronized, label);
    }
    await fetch();
    return null;
  } catch (err) {
    errorLog('KeyStore.fetch: err:', err);
    return err as Error;
  }
}
export default { init, useList, fetch, createKey };
