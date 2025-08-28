import { useCallback, useSyncExternalStore } from 'react';
import EventEmitter from 'events';
import { Terminal } from '@xterm/xterm';
import { displayStateToAnsi, jsonParse } from '@ai-screen/shared';
import { ReactRendererAddon } from '../components/xterm_react_renderer_addon';

import { createWebSocket } from '../tools/api';
import { log, errorLog } from '../tools/log';

import type { IDisposable, ITerminalOptions } from '@xterm/xterm';
import type {
  WsClientMessage,
  WsServerMessage,
  SessionJson,
} from '@ai-screen/shared';

const CONNECT_TIMEOUT = 2 * 1000;

export default { connect, disconnect, resize, useTerminal, useTerminalSize };

export interface Size {
  rows: number;
  columns: number;
}

const g_mountedMap = new Map<
  string,
  { element: HTMLDivElement | null; terminal: Terminal; webSocket: WebSocket }
>();
const g_elementMap = new Map<string, HTMLDivElement>();
const g_sizeMap = new Map<string, Size>();
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
export function useTerminalSize(sessionName: string) {
  const _get = useCallback(() => {
    return g_sizeMap.get(sessionName);
  }, [sessionName]);
  return useSyncExternalStore(_subscribe, _get);
}
export function useTerminal(sessionName: string) {
  const _get = useCallback(() => {
    return g_mountedMap.get(sessionName)?.terminal;
  }, [sessionName]);
  return useSyncExternalStore(_subscribe, _get);
}
interface ConnectParams {
  session: SessionJson;
  element: HTMLDivElement;
  terminalOptions: Partial<ITerminalOptions>;
}
export function connect(params: ConnectParams) {
  const { session, element } = params;
  const { sessionName } = session;

  const mounted = g_mountedMap.get(sessionName);
  if (mounted) {
    const { terminal, element: old_element, webSocket } = mounted;
    old_element?.remove();
    terminal.open(element);
    g_mountedMap.set(sessionName, { terminal, element, webSocket });
    _emit('update');
  } else if (g_elementMap.has(sessionName)) {
    g_elementMap.set(sessionName, element);
    // _create running implicitly
  } else {
    g_elementMap.set(sessionName, element);
    void _create(params);
  }
}
interface DisconnectParams {
  session: SessionJson;
  element: HTMLDivElement;
}
export function disconnect(params: DisconnectParams) {
  const { sessionName } = params.session;
  const mounted = g_mountedMap.get(sessionName);
  if (mounted) {
    const { webSocket } = mounted;
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
  const webSocket = g_mountedMap.get(session.sessionName)?.webSocket;
  if (webSocket) {
    _send(webSocket, { type: 'resize' as const, columns, rows });
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
      let data_dispose: IDisposable | null = null;
      const connect_timeout = setTimeout(() => {
        _cleanup();
        reject(new Error('timeout'));
      }, CONNECT_TIMEOUT);
      function _onMessage(ev: MessageEvent) {
        const data = ev.data as string;
        const obj = jsonParse<WsServerMessage>(data);
        if (obj?.type === 'connect_success') {
          clearTimeout(connect_timeout);
          g_sizeMap.set(sessionName, { rows: obj.rows, columns: obj.columns });
          const opts = {
            rows: obj.rows,
            cols: obj.columns,
            ...terminalOptions,
          };
          terminal = new Terminal(opts);
          terminal.loadAddon(new ReactRendererAddon());
          const element = g_elementMap.get(sessionName) ?? null;
          if (element) {
            terminal.open(element);
          } else {
            errorLog('connect_store._create: no element!');
            return;
          }

          data_dispose = terminal.onData(_onData);
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
          g_mountedMap.set(sessionName, { element, terminal, webSocket: ws });
          _emit('update');
          log('connect_store._create: success:', obj.rows, obj.columns);
        } else if (obj?.type === 'data') {
          terminal?.write(obj.data);
        } else if (obj?.type === 'resize') {
          g_sizeMap.set(sessionName, { rows: obj.rows, columns: obj.columns });
          _emit('resize');
          terminal?.resize(obj.columns, obj.rows);
        } else if (obj?.type === 'disconnect') {
          log('connect_store._create: disconnect');
          ws.close();
        } else {
          errorLog('connect_store._create: bad message:', data);
        }
      }
      function _onData(data: string) {
        _send(ws, { type: 'write', data });
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
        data_dispose?.dispose();
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
    g_elementMap.delete(sessionName);
    g_mountedMap.delete(sessionName);
  }
}
function _send(ws: WebSocket, msg: WsClientMessage) {
  ws.send(JSON.stringify(msg));
}
