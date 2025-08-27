import type { AnsiDisplayJson, BufferState } from './ansi';
import type { DeepPartial } from './helper';

export type DisconnectMessage = {
  type: 'disconnect';
  reason: string;
} & AnsiDisplayJson;

export type WsServerMessage =
  | {
      type: 'connect_success';
      rows: number;
      columns: number;
      normal?: BufferState;
      alternate?: BufferState;
    }
  | { type: 'error'; err: string }
  | { type: 'resize'; rows: number; columns: number }
  | { type: 'data'; data: string }
  | DisconnectMessage;

export type WsClientMessage =
  | ({
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows?: number;
      columns?: number;
    } & DeepPartial<AnsiDisplayJson>)
  | { type: 'write'; data: string }
  | { type: 'resize'; rows: number; columns: number }
  | { type: 'detach' };
