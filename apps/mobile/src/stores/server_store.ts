import { EventEmitter } from 'events';

import { useCallback, useSyncExternalStore } from 'react';
import { RSAKeychain } from 'react-native-rsa-native';
import { v4 as uuid } from 'uuid';

import { errorLog } from '../tools/log';
import { setItem, getItem } from '../tools/storage';
import { deepEqual, herd } from '../tools/util';

import type { KeychainItem } from 'react-native-rsa-native';

const SERVER_LIST_KEY = 'server_list';

export interface Server {
  server_id: string;
  hostname: string;
  port: number;
  username: string;
}

let g_initRun = false;
let g_list: Server[] = [];

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
  console.log('init:', g_initRun);
  if (!g_initRun) {
    g_initRun = true;
    await _load();
  }
}
function _getList() {
  return g_list;
}
export function useList() {
  return useSyncExternalStore(_subscribe, _getList);
}
export function useServer(server_id: string) {
  const _get = useCallback(() => {
    return g_list.find((k) => k.server_id === server_id);
  }, [server_id]);
  return useSyncExternalStore(_subscribe, _get);
}
async function _load() {
  console.log('_load');
  const { err, value } = (await getItem<Server[]>(SERVER_LIST_KEY)) ?? [];
  console.log(err, value);
  if (err) {
    errorLog('ServerStore._load: err:', err);
    g_list = [];
  } else {
    g_list = value ?? [];
  }
  _emit('load');
}
async function _save() {
  try {
    await setItem({ key: SERVER_LIST_KEY, value: g_list });
  } catch (err) {
    errorLog('ServerStore._save: err:', err);
  }
}
interface CreateServerParams {
  hostname: string;
  port: number;
  username: string;
}
export async function createServer(
  params: CreateServerParams
): Promise<Error | string> {
  try {
    const server_id = uuid();
    g_list.push({ server_id, ...params });
    await _save();
    _emit('update');
    return server_id;
  } catch (err) {
    errorLog('ServerStore.createServer: err:', err);
    return err as Error;
  }
}
export interface UpdateServerParams {
  server_id: string;
  hostname: string;
  port: number;
  username: string;
}
export async function updateServer(
  params: UpdateServerParams
): Promise<Error | null> {
  try {
    const index = g_list.findIndex((s) => s.server_id === params.server_id);
    if (index !== -1) {
      g_list.splice(index, 1);
    }
    g_list.push(params);
    await _save();
    _emit('update');
    return null;
  } catch (err) {
    errorLog('KeyStore.updateServer: err:', err);
    return err as Error;
  }
}
export async function deleteServer(server_id: string) {
  try {
    const index = g_list.findIndex((s) => s.server_id === server_id);
    if (index !== -1) {
      g_list.splice(index, 1);
    }
    await _save();
    _emit('delete');
    return null;
  } catch (err) {
    errorLog('KeyStore.deleteServer: err:', err);
    return err as Error;
  }
}
export default {
  init,
  useList,
  useServer,
  createServer,
  updateServer,
  deleteServer,
};
