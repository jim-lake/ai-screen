import { EventEmitter } from 'events';

import { useCallback, useSyncExternalStore } from 'react';
import { RSAKeychain } from 'react-native-rsa-native';
import { v4 as uuid } from 'uuid';

import { errorLog } from '../tools/log';
import { deepEqual, herd } from '../tools/util';

import type { KeychainItem } from 'react-native-rsa-native';

export type KeyType = 'rsa' | 'ec' | 'ed';

export interface SshKey extends KeychainItem {
  sshPublicKey: string;
}

let g_list: SshKey[] = [];

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
export function useKey(tag: string) {
  const _get = useCallback(() => {
    return g_list.find((k) => k.tag === tag);
  }, [tag]);
  return useSyncExternalStore(_subscribe, _get);
}
export const fetch = herd(async (): Promise<void> => {
  try {
    const raw_list = await RSAKeychain.getAllKeys();
    const new_list = raw_list.map(_transformKey);
    if (!deepEqual(g_list, new_list)) {
      g_list = new_list;
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
): Promise<Error | string> {
  const { label, type, size, synchronized } = params;
  try {
    let tag: string;
    if (type === 'ed') {
      tag = `ed-${uuid()}`;
      await RSAKeychain.generateEd(tag, synchronized, label);
    } else if (type === 'ec') {
      tag = `ec-${uuid()}`;
      await RSAKeychain.generateEC(tag, synchronized, label);
    } else {
      tag = `rsa-${uuid()}`;
      await RSAKeychain.generateKeys(tag, size, synchronized, label);
    }
    await fetch();
    return tag;
  } catch (err) {
    errorLog('KeyStore.createKey: err:', err);
    return err as Error;
  }
}
export interface UpdateKeyParams {
  tag: string;
  label: string;
}
export async function updateKey(
  params: UpdateKeyParams
): Promise<Error | null> {
  try {
    await RSAKeychain.updatePrivateKey(params.tag, params.label);
    await fetch();
    return null;
  } catch (err) {
    errorLog('KeyStore.updateKey: err:', err);
    return err as Error;
  }
}
export async function deleteKey(tag: string): Promise<Error | null> {
  try {
    await RSAKeychain.deletePrivateKey(tag);
    await fetch();
    return null;
  } catch (err) {
    errorLog('KeyStore.deletePrivateKey: err:', err);
    return err as Error;
  }
}
function _transformKey(item: KeychainItem): SshKey {
  let sshPublicKey = '';
  if (item.tag?.startsWith('ed')) {
    item.type = 'ED';
    sshPublicKey = `ssh-ed25519 ${item.publicEd25519}`;
  } else if (item.tag?.startsWith('ec')) {
    sshPublicKey = `ecdsa-sha2-nistp256 ${item.public}`;
  } else {
    sshPublicKey = `ssh-rsa ${item.public}`;
  }
  if (item.label) {
    sshPublicKey += ' ' + item.label;
  }
  return Object.assign({}, item, { sshPublicKey });
}
export default {
  init,
  useList,
  useKey,
  fetch,
  createKey,
  updateKey,
  deleteKey,
};
