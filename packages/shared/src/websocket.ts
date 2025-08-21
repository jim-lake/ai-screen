import type { AnsiDisplayJson } from './common';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type DeepPartial<T> = T extends Function
  ? T
  : T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export type DisconnectMessage = {
  type: 'disconnect';
  reason: string;
} & AnsiDisplayJson;

export type WsServerMessage =
  | { type: 'connect_success' }
  | { type: 'error'; err: string }
  | DisconnectMessage;

export type WsClientMessage =
  | ({
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows: number;
      columns: number;
    } & DeepPartial<AnsiDisplayJson>)
  | { type: 'write'; name: string; data: string }
  | { type: 'resize'; name: string; rows: number; columns: number }
  | { type: 'detach'; name: string };
