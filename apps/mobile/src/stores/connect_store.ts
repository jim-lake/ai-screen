import { EventEmitter } from 'events';

import { useCallback, useSyncExternalStore } from 'react';
import SSHClient from 'react-native-ssh-sftp';

import { errorLog } from '../tools/log';
import { setItem, getItem } from '../tools/storage';

import KeyStore from './key_store';

import type { SshKey } from './key_store';
import type { Server } from './server_store';

export default { useConnection, connect };

const g_clientMap = new Map<string, SSHClient>();

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
export function useConnection(server_id: string) {
  const _get = useCallback(() => {
    return g_list.find((k) => k.server_id === server_id);
  }, [server_id]);
  return useSyncExternalStore(_subscribe, _get);
}
interface CreateServerParams {
  hostname: string;
  port: number;
  username: string;
}
export async function connect(server: Server): Promise<Error | null> {
  try {
    console.log('connect:', server.hostname, server.port, server.username);
    const client = await SSHClient.connect(
      server.hostname,
      server.port,
      server.username
    );
    console.log('connected');
    const keys = KeyStore.getList().filter(_filterPrivate);
    console.log('keys:', keys);
    for (const key of keys) {
      const err = await _authTry(client, key);
      if (!err) {
        g_clientMap.set(server.server_id, client);
        _emit('update');
        return null;
      }
    }
    client.disconnect();
    g_clientMap.delete(server.server_id);
    return new Error('no_auth');
  } catch (err) {
    errorLog('ConnectStore.connect: err:', err);
    return err as Error;
  }
}
async function _authTry(client: SSHClient, key: SshKey): Promise<Error | null> {
  try {
    async function _sign(data: string) {
      try {
        console.log('_sign:', data);
        const result = await KeyStore.sign({ key, data });
        console.log('_sign.result:', result);
        return result;
      } catch (e) {
        console.error('_sign threw:', e);
        return '';
      }
    }
    console.log('_authTry:', key.sshWireKey);
    await client.authenticateWithSignCallback(key.sshWireKey, _sign);
    console.log('_authTry: success!');
    return null;
  } catch (e) {
    errorLog('ConnectStore._authTry: threw:', e, e.code, e.errno);
    return e as Error;
  }
}
function _filterPrivate(k) {
  return k.class === 'Private';
}
