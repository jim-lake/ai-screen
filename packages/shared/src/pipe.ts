import type { WsServerMessage, WsClientMessage } from './websocket';

export type PipeServerMessage = WsServerMessage | { type: 'pong' };

export type PipeClientMessage =
  | WsClientMessage
  | { type: 'ping'; name: string };
