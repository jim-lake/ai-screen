import { WebSocketServer } from 'ws';

import { log, errorLog } from '../tools/log';

import type { Server } from 'node:http';
import type { WebSocket, RawData } from 'ws';

export interface StartParams {
  server: Server;
}
export function start(params: StartParams) {
  const wss = new WebSocketServer({ server: params.server });
  wss.on('connection', _onServerConnection);
  wss.on('error', _onServerError);
  params.server.setTimeout(0);
}
function _onServerConnection(ws: WebSocket) {
  ws.on('close', _onClose);
  ws.on('error', _onError);
  ws.on('message', _onMessage);
  ws.on('ping', _onPing);
  ws.on('pong', _onPong);
}
function _onServerError(error: Error) {
  errorLog('wss_server._onServerError:', error);
}
function _onClose(this: WebSocket, code: number, reason: Buffer) {
  log('wss_server._onClose:', this, code, reason);
}
function _onError(this: WebSocket, error: Error) {
  errorLog('wss_server._onError:', this, error);
}
function _onMessage(this: WebSocket, data: RawData, is_binary: boolean) {
  log('wss_server._onMessage:', this, data, is_binary);
}
function _onPing(this: WebSocket, data: Buffer) {
  log('wss_server._onPing:', this, data);
}
function _onPong(this: WebSocket, data: Buffer) {
  log('wss_server._onPong:', this, data);
}
