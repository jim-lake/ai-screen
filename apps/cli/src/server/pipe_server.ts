import unix from 'unix-dgram';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getSession } from '../lib/session';
import { log } from '../tools/log';
import { jsonParse } from '../tools/util';

import type { RInfo } from 'unix-dgram';

export const SOCK_PATH = join(tmpdir(), crypto.randomUUID() + '.sock');
export default { start, SOCK_PATH };

let g_socket: ReturnType<typeof unix.createSocket> | null = null;

export function start() {
  g_socket = unix.createSocket('unix_dgram');
  g_socket.bind(SOCK_PATH);
  g_socket.on('message', _onMessage);
  return SOCK_PATH;
}
function _onMessage(msg: Buffer, rinfo: RInfo) {
  log('received:', msg.toString(), rinfo);
  const obj = jsonParse(msg.toString());
  if (typeof obj?.session_name === 'string') {
    const session = getSession(obj.session_name);
    log('session:', session);
  }

  if (rinfo.ancillary) {
    log('received hex:', rinfo.ancillary.toString('hex'));
    log('received utf8:', rinfo.ancillary.toString('utf8'));
  }
}
