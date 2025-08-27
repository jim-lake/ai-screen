import { WebSocketServer } from 'ws';
import { Socket } from 'node:net';
import { jsonParse } from '@ai-screen/shared';

import type { Session } from '../lib/session';
import { getSession } from '../lib/session';
import { log, errorLog } from '../tools/log';

import type { IncomingMessage, Server } from 'node:http';
import type { WebSocket } from 'ws';
import type { WsClientMessage, WsServerMessage } from '@ai-screen/shared';
import type { Client } from '../lib/client';

export default { start };

let g_wssCounter = 1;

const g_socketMap = new Map<WebSocket, { session: Session; client: Client }>();
const g_socketPathMap = new Map<WebSocket, string>();

export interface StartParams {
  server: Server;
}
export function start(params: StartParams) {
  const wss = new WebSocketServer({ server: params.server });
  wss.on('connection', _onServerConnection);
  wss.on('error', _onServerError);
  params.server.setTimeout(0);
}
function _onServerConnection(ws: WebSocket, req: IncomingMessage) {
  const path = `wss://${g_wssCounter++}`;
  g_socketPathMap.set(ws, path);
  ws.on('close', _onClose);
  ws.on('error', _onError);
  ws.on('message', _onMessage);
  ws.on('ping', _onPing);
  ws.on('pong', _onPong);

  const ua = req.headers['user-agent'] ?? '-';
  const referrer = req.headers['referer'] ?? '-';
  const url = req.url ?? '/';
  const status = 101;
  _log(
    ws,
    `"CONNECT ${url} HTTP/$${req.httpVersionMajor}.${req.httpVersionMinor}" ${status} - "${referrer}" "${ua}"`
  );
}
function _onServerError(error: Error) {
  errorLog('wss_server._onServerError:', error);
}
function _onClose(this: WebSocket, code: number, reason: Buffer) {
  const found = g_socketMap.get(this);
  if (found) {
    log(
      'wss_server._onClose: session:',
      found.session.name,
      'client:',
      found.client.path
    );
    found.session.detach(found.client.path);
  } else {
    errorLog('wss_server._onClose: close but session not found');
  }
  this.removeAllListeners();
  g_socketMap.delete(this);
  g_socketPathMap.delete(this);
  _log(this, `"CLOSE WS" ${code} ${reason.toString('utf8')} -`);
}
function _onError(this: WebSocket, error: Error) {
  errorLog('wss_server._onError:', _getAddr(this), error);
}
function _onMessage(this: WebSocket, raw_data: Buffer) {
  const json = raw_data.toString('utf8');
  const obj = jsonParse<WsClientMessage>(json);
  const path = g_socketPathMap.get(this);
  const type = obj?.type;

  let result = 'unhandled';
  if (!path) {
    errorLog('wss_server._onMessage: no path for socket:', json);
    result = 'no_path';
  } else if (!type) {
    errorLog('wss_server._onMessage: bad message:', json);
    result = 'bad_message';
  } else if (type === 'connect') {
    const session = getSession(obj.name);
    if (session) {
      try {
        const client = session.connectClient({ path, ...obj });
        g_socketMap.set(this, { session, client });
        client.on('disconnect', (event) => {
          _send(this, { type: 'disconnect' as const, ...event });
          this.close(0, 'disconnect');
        });
        client.on('write', (data) => {
          _send(this, { type: 'data' as const, data });
        });
        client.on('resize', (size) => {
          _send(this, { type: 'resize' as const, ...size });
        });
        const { rows, columns } = session.terminalParams;
        const state = session.activeTerminal?.getScreenState();
        if (state) {
          _send(this, { type: 'connect_success', rows, columns, ...state });
        } else {
          errorLog('wss_server._onMessage: connect no state:', session);
          _send(this, { type: 'error', err: 'connect_failed' });
        }
        result = 'success';
      } catch (e) {
        if (e instanceof Error && e.message === 'conflict') {
          _send(this, {
            type: 'error' as const,
            err: 'SESSION_ALREADY_CONNECTED',
          });
          result = 'already_connected';
        } else {
          _send(this, { type: 'error' as const, err: 'CONNECT_FAILED' });
          result = 'connect_failed';
        }
      }
    } else {
      result = 'session_not_found';
      _send(this, { type: 'error' as const, err: 'session_not_found' });
    }
  } else if (type === 'write') {
    const data = g_socketMap.get(this);
    if (data) {
      data.session.write(obj.data);
      result = 'success';
    } else {
      _send(this, { type: 'error' as const, err: 'client_not_found' });
      result = 'client_not_found';
    }
  } else if (type === 'resize') {
    const data = g_socketMap.get(this);
    if (data) {
      data.session.resize(obj);
      result = 'success';
    } else {
      _send(this, { type: 'error' as const, err: 'client_not_found' });
      result = 'client_not_found';
    }
  } else {
    errorLog('wss_server._onMessage: unhandled', json);
    result = 'unhandled';
  }
  _log(this, `"MESSAGE ${type ?? 'unknown'} WS" ${result} - - -`);
}
function _onPing(this: WebSocket, _data: Buffer) {
  _log(this, `"PING WS" - - - -`);
}
function _onPong(this: WebSocket, _data: Buffer) {
  _log(this, `"PONG WS" - - - -`);
}
function _send(ws: WebSocket, msg: WsServerMessage) {
  ws.send(JSON.stringify(msg));
}
interface ServerWebSocket extends WebSocket {
  _socket: Socket;
}
function _isServerWebSocket(ws: WebSocket): ws is ServerWebSocket {
  return '_socket' in ws && ws['_socket'] instanceof Socket;
}
function _getAddr(ws: WebSocket) {
  if (_isServerWebSocket(ws)) {
    const ip = ws._socket.remoteAddress?.replace(/^::ffff:/, '') ?? '-';
    const port = ws._socket.remotePort ?? 0;
    return `${ip}:${port}`;
  } else {
    return 'unknown';
  }
}
function _log(ws: WebSocket, str: string) {
  log(`${_getAddr(ws)} ${str}`);
}
