export type PipeMessage =
  | {
      type: 'connect';
      name: string;
      exclusive: boolean;
      rows: number;
      columns: number;
    }
  | { type: 'connect_success' }
  | { type: 'connect_error'; err: string }
  | { type: 'write'; name: string; data: string }
  | { type: 'resize'; name: string; rows: number; columns: number }
  | { type: 'detach'; name: string }
  | { type: 'disconnect'; reason: string }
  | { type: 'ping'; name: string }
  | { type: 'pong' };
