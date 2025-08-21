import React from 'react';
import EventEmitter from 'events';

import Api from '../tools/api';
import { deepEqual, herd } from '../tools/util';
import { errorLog } from '../tools/log';

import type { SessionListJson, SessionJson } from '@ai-screen/shared';

let g_list: SessionJson[] | null;

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
function _getList() {
  return g_list;
}
export function useList() {
  return React.useSyncExternalStore(_subscribe, _getList);
}
export function useSession(name: string) {
  const list = useList();
  return list?.find((s) => s.sessionName === name);
}
export const fetch = herd(async (): Promise<Error | null> => {
  const opts = { url: `/api/1/session` };
  const res = await Api.get<SessionListJson>(opts);
  if (res.err) {
    errorLog('SessionStore.fetch: err:', res.err, res.body);
  } else {
    if (!deepEqual(g_list, res.body.sessions)) {
      g_list = res.body.sessions;
      _emit('fetch');
    }
  }
  return res.err;
});
export default { useList, useSession, fetch };
