import { useCallback, useSyncExternalStore } from 'react';
import EventEmitter from 'events';
import { Terminal } from '@xterm/headless';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { displayStateToAnsi, jsonParse } from '@ai-screen/shared';

import { createWebSocket } from '../tools/api';
import { log, errorLog } from '../tools/log';

import type {
  IDisposable,
  ITerminalOptions,
  ITerminalAddon,
} from '@xterm/headless';
import type {
  WsClientMessage,
  WsServerMessage,
  SessionJson,
} from '@ai-screen/shared';

const CONNECT_TIMEOUT = 2 * 1000;

export default {
  connect,
  disconnect,
  resize,
  write,
  useTerminal,
  useTerminalSize,
};

export interface Size {
  rows: number;
  columns: number;
}

const g_mountedMap = new Map<
  string,
  { terminal: Terminal; webSocket: WebSocket }
>();
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
  terminalOptions: Partial<ITerminalOptions>;
}
export function connect(params: ConnectParams) {
  const { session } = params;
  const { sessionName } = session;

  const mounted = g_mountedMap.get(sessionName);
  if (!mounted) {
    void _create(params);
  }
}
interface DisconnectParams {
  session: SessionJson;
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
interface WriteParams {
  session: SessionJson;
  data: string;
}
export function write(params: WriteParams) {
  const { session, data } = params;
  const webSocket = g_mountedMap.get(session.sessionName)?.webSocket;
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
            allowProposedApi: true,
            rows: obj.rows,
            cols: obj.columns,
            ...terminalOptions,
          };
          terminal = new Terminal(opts);
          terminal.loadAddon(new Unicode11Addon() as unknown as ITerminalAddon);
          terminal.unicode.activeVersion = '11';
          //terminal.loadAddon(new ReactRendererAddon());

          data_dispose = null; // No longer listening to terminal.onData
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
          (globalThis as { terminal?: unknown }).terminal = terminal;
          g_mountedMap.set(sessionName, { terminal, webSocket: ws });
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
    g_mountedMap.delete(sessionName);
  }
}
function _send(ws: WebSocket, msg: WsClientMessage) {
  ws.send(JSON.stringify(msg));
}
