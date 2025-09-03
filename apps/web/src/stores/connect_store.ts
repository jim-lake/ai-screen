import { useCallback, useSyncExternalStore } from 'react';
import EventEmitter from 'events';
import { Terminal } from '@xterm/headless';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { displayStateToAnsi, jsonParse } from '@ai-screen/shared';

import ScrollbackStore from './scrollback_store';

import { createWebSocket } from '../tools/api';
import { log, errorLog } from '../tools/log';

import type { ITerminalOptions, ITerminalAddon } from '@xterm/headless';
import type {
  WsClientMessage,
  WsServerMessage,
  SessionJson,
} from '@ai-screen/shared';

const CONNECT_TIMEOUT = 2 * 1000;

export default { connect, disconnect, resize, write, useConnectedSession };

interface ConnectedSession {
  terminal: Terminal;
  webSocket: WebSocket;
  terminalId: number;
  rows: number;
  columns: number;
}
const g_connectedMap = new Map<string, ConnectedSession>();
const g_eventEmitter = new EventEmitter();
function _emit(sessionName: string) {
  g_eventEmitter.emit(sessionName);
}
export function useConnectedSession(sessionName: string) {
  const _sub = useCallback(
    (callback: () => void) => {
      g_eventEmitter.on(sessionName, callback);
      return () => {
        g_eventEmitter.off(sessionName, callback);
      };
    },
    [sessionName]
  );
  const _get = useCallback(() => {
    return g_connectedMap.get(sessionName);
  }, [sessionName]);
  return useSyncExternalStore(_sub, _get);
}
interface ConnectParams {
  session: SessionJson;
  terminalOptions: Partial<ITerminalOptions>;
}
export function connect(params: ConnectParams) {
  const { session } = params;
  const { sessionName } = session;

  const found = g_connectedMap.get(sessionName);
  if (!found) {
    void _create(params);
  }
}
interface DisconnectParams {
  session: SessionJson;
}
export function disconnect(params: DisconnectParams) {
  const { session } = params;
  const webSocket = g_connectedMap.get(session.sessionName)?.webSocket;
  if (webSocket) {
    _send(webSocket, { type: 'detach' as const });
  }
}
interface ResizeParams {
  session: SessionJson;
  columns: number;
  rows: number;
}
export function resize(params: ResizeParams) {
  const { session, columns, rows } = params;
  const webSocket = g_connectedMap.get(session.sessionName)?.webSocket;
  if (webSocket) {
    _send(webSocket, { type: 'resize' as const, columns, rows });
  }
}
interface WriteParams {
  session: SessionJson;
  data: string;
}
export function write(params: WriteParams) {
  const { session, data } = params;
  const webSocket = g_connectedMap.get(session.sessionName)?.webSocket;
  if (webSocket) {
    _send(webSocket, { type: 'write' as const, data });
  }
}
async function _create(params: ConnectParams) {
  const { terminalOptions } = params;
  const { sessionName } = params.session;
  try {
    const ws = await createWebSocket({});
    await new Promise<void>((resolve, reject) => {
      const controller = new AbortController();
      const { signal } = controller;
      let terminal: Terminal | null = null;
      const connect_timeout = setTimeout(() => {
        _cleanup();
        reject(new Error('timeout'));
      }, CONNECT_TIMEOUT);
      function _onMessage(ev: MessageEvent) {
        const data = ev.data as string;
        const obj = jsonParse<WsServerMessage>(data);
        if (obj?.type === 'connect_success') {
          clearTimeout(connect_timeout);
          const opts = {
            allowProposedApi: true,
            rows: obj.rows,
            cols: obj.columns,
            ...terminalOptions,
          };
          terminal = new Terminal(opts);
          terminal.loadAddon(new Unicode11Addon() as unknown as ITerminalAddon);
          terminal.unicode.activeVersion = '11';
          if (obj.normal) {
            terminal.write(obj.normal.buffer.join('\r\n'));
            terminal.write(displayStateToAnsi({ cursor: obj.normal.cursor }));
          }
          if (obj.alternate) {
            terminal.write(displayStateToAnsi({ altScreen: true }));
            terminal.write(obj.alternate.buffer.join('\r\n'));
            terminal.write(
              displayStateToAnsi({ cursor: obj.alternate.cursor })
            );
          }
          ScrollbackStore.setScrollback(
            sessionName,
            obj.terminalId,
            obj.scrollbackLines ?? 0
          );
          g_connectedMap.set(sessionName, {
            terminal,
            webSocket: ws,
            terminalId: obj.terminalId,
            rows: obj.rows,
            columns: obj.columns,
          });
          _emit(sessionName);
          log('connect_store._create: success:', obj.rows, obj.columns);
        } else if (obj?.type === 'data') {
          terminal?.write(obj.data);
        } else if (obj?.type === 'resize') {
          const old_data = g_connectedMap.get(sessionName);
          if (old_data) {
            const new_data = Object.assign({}, old_data, {
              rows: obj.rows,
              columns: obj.columns,
            });
            g_connectedMap.set(sessionName, new_data);
            _emit(sessionName);
          }
          terminal?.resize(obj.columns, obj.rows);
        } else if (obj?.type === 'disconnect') {
          log('connect_store._create: disconnect');
          ws.close();
        } else {
          errorLog('connect_store._create: bad message:', data);
        }
      }
      function _onClose(): void {
        _cleanup();
        resolve();
      }
      function _onError(ev: Event): void {
        errorLog('connect_store._create: on error:', ev);
        _cleanup();
        reject(new Error('error'));
      }
      function _cleanup() {
        controller.abort();
        clearTimeout(connect_timeout);
      }
      ws.addEventListener('message', _onMessage, { signal });
      ws.addEventListener('close', _onClose, { signal });
      ws.addEventListener('error', _onError, { signal });
      _send(ws, { type: 'connect', name: sessionName, exclusive: false });
    });
    return;
  } catch (e) {
    errorLog('connect_store._create error:', e);
  } finally {
    g_connectedMap.delete(sessionName);
  }
}
function _send(ws: WebSocket, msg: WsClientMessage) {
  ws.send(JSON.stringify(msg));
}
