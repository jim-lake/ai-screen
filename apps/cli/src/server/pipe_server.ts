import unix from 'unix-dgram';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { getSession } from '../lib/session';
import { log, errorLog } from '../tools/log';
import { jsonParse } from '../tools/util';

import type { RInfo } from 'unix-dgram';
import type { PipeMessage } from '../lib/pipe';

export const SOCK_PATH = join(tmpdir(), randomUUID() + '.sock');
export default { start, SOCK_PATH };

let g_socket: ReturnType<typeof unix.createSocket> | null = null;

export function start() {
  g_socket = unix.createSocket('unix_dgram');
  g_socket.on('message', _onMessage);
  g_socket.on('error', _onError);
  g_socket.bind(SOCK_PATH);
  log('pipe_server.start:', SOCK_PATH);
  return SOCK_PATH;
}
function _onMessage(msg: Buffer, rinfo?: RInfo) {
  log('received:', msg.toString('utf8'), rinfo);
  const path = rinfo?.path;
  const fd = rinfo?.fds?.[0];
  try {
    const obj = jsonParse<PipeMessage>(msg.toString('utf8'));
    if (obj?.type === 'connect') {
      const { exclusive, rows, columns } = obj;
      const session = getSession(obj.name);
      if (!session) {
        _send(path, { type: 'connect_error', err: 'SESSION_NOT_FOUND' });
      } else if (exclusive && session.clients.length > 0) {
        _send(path, {
          type: 'connect_error' as const,
          err: 'SESSION_ALREADY_CONNECTED',
        });
      } else if (!path) {
        _send(path, {
          type: 'connect_error' as const,
          err: 'BAD_CONNECT_PATH',
        });
      } else if (!fd) {
        _send(path, { type: 'connect_error' as const, err: 'BAD_CONNECT_FD' });
      } else {
        const client = session.connectClient({ path, fd, rows, columns });
        client.on('disconnect', (reason) => {
          _send(path, { type: 'disconnect' as const, reason });
        });
        _send(path, { type: 'connect_success' as const });
      }
    }
  } catch (e) {
    errorLog('pipe_server._onMessage: threw:', e);
  }
}
function _send(path: string | undefined, msg: PipeMessage) {
  if (g_socket && path) {
    const buf = Buffer.from(JSON.stringify(msg));
    g_socket.sendto(buf, 0, buf.length, path);
  }
}
function _onError(err: Error) {
  errorLog('pipe_server._onError:', err);
}
