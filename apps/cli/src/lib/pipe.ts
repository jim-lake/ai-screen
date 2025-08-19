import type { AnsiDisplayState } from '../tools/ansi';

export type PipeServerMessage =
  | { type: 'connect_success' }
  | { type: 'error'; err: string }
  | ({ type: 'disconnect'; reason: string } & AnsiDisplayState)
  | { type: 'pong' };
export type PipeClientMessage =
  | ({
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows: number;
      columns: number;
    } & AnsiDisplayState)
  | { type: 'write'; name: string; data: string }
  | { type: 'resize'; name: string; rows: number; columns: number }
  | { type: 'detach'; name: string }
  | { type: 'ping'; name: string };
