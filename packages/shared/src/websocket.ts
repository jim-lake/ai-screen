import type { AnsiDisplayJson } from './common';

export type WsServerMessage =
  | { type: 'connect_success' }
  | { type: 'error'; err: string }
  | ({ type: 'disconnect'; reason: string } & AnsiDisplayJson);
export type WsClientMessage =
  | ({
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows: number;
      columns: number;
    } & AnsiDisplayJson)
  | { type: 'write'; name: string; data: string }
  | { type: 'resize'; name: string; rows: number; columns: number }
  | { type: 'detach'; name: string };
