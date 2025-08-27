import unix from 'unix-dgram';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { jsonParse } from '@ai-screen/shared';

import { getSession } from '../lib/session';
import { log, errorLog } from '../tools/log';

import type { RInfo } from 'unix-dgram';
import type { PipeClientMessage, PipeServerMessage } from '@ai-screen/shared';

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
  const path = rinfo?.path;
  const fd = rinfo?.fds?.[0];
  try {
    const obj = jsonParse<PipeClientMessage>(msg.toString('utf8'));
    const session = obj?.name ? getSession(obj.name) : null;
    if (obj === undefined) {
      _send(path, { type: 'error', err: 'BAD_MESSAGE' });
    } else if (!session) {
      _send(path, { type: 'error', err: 'SESSION_NOT_FOUND' });
    } else if (obj.type === 'connect') {
      if (!path) {
        _send(path, { type: 'error' as const, err: 'BAD_CONNECT_PATH' });
      } else if (!fd) {
        _send(path, { type: 'error' as const, err: 'BAD_CONNECT_FD' });
      } else {
        try {
          const { client, state, created } = session.connectClient({
            ...obj,
            path,
            fd,
          });
          if (!created && state) {
            client.changeTerminal(null, state);
          }
          client.on('disconnect', (result) => {
            _send(path, {
              type: 'disconnect' as const,
              reason: result.reason,
              cursor: result.cursor,
              altScreen: result.altScreen,
            });
          });
          _send(path, { type: 'connect_success' as const });
        } catch (e) {
          if (e instanceof Error && e.message === 'conflict') {
            _send(path, {
              type: 'error' as const,
              err: 'SESSION_ALREADY_CONNECTED',
            });
          } else {
            _send(path, { type: 'error' as const, err: 'CONNECT_FAILED' });
          }
        }
      }
    } else if (obj.type === 'write') {
      session.write(obj.data);
    } else if (obj.type === 'resize') {
      session.resize({ columns: obj.columns, rows: obj.rows });
    } else if (obj.type === 'detach') {
      if (path) {
        session.detach(path);
      }
    }
  } catch (e) {
    errorLog('pipe_server._onMessage: threw:', e);
    const err = e instanceof Error ? e.message : 'unknown';
    _send(path, { type: 'error', err });
  }
}
function _send(path: string | undefined, msg: PipeServerMessage) {
  if (g_socket && path) {
    const buf = Buffer.from(JSON.stringify(msg));
    g_socket.sendto(buf, 0, buf.length, path);
  }
}
function _onError(err: Error) {
  errorLog('pipe_server._onError:', err);
}
