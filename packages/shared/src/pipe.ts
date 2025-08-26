import type { AnsiDisplayJson } from './ansi';
import type { DisconnectMessage } from './websocket';
import type { DeepPartial } from './helper';

export type PipeServerMessage =
  | { type: 'connect_success' }
  | { type: 'error'; err: string }
  | DisconnectMessage
  | { type: 'resize'; rows: number; columns: number }
  | { type: 'pong' };

export type PipeClientMessage =
  | ({
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows: number;
      columns: number;
    } & DeepPartial<AnsiDisplayJson>)
  | { type: 'write'; name: string; data: string }
  | { type: 'resize'; name: string; rows: number; columns: number }
  | { type: 'detach'; name: string }
  | { type: 'ping'; name: string };
