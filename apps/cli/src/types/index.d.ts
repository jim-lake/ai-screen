declare module 'unix-dgram' {
  import type { EventEmitter } from 'events';
  import type { Buffer } from 'buffer';

  export interface RInfo {
    address: string;
    size?: number;
    ancillary?: Buffer;
  }

  export type MessageListener = (msg: Buffer, rinfo?: RInfo) => void;
  export type ErrorListener = (err: Error) => void;
  export type ListeningListener = (path: string) => void;
  export type ConnectListener = (path: string) => void;

  export interface Socket extends EventEmitter {
    bind(path: string): void;
    connect(path: string): void;
    send(
      buf: Buffer,
      offset?: number,
      length?: number,
      path?: string,
      callback?: (err: Error | null) => void
    ): void;
    send_to(
      buf: Buffer,
      offset: number,
      length: number,
      path: string,
      callback?: (err: Error | null) => void
    ): void;
    close(): void;
    on(event: 'message', listener: MessageListener): this;
    on(event: 'listening', listener: ListeningListener): this;
    on(event: 'connect', listener: ConnectListener): this;
    on(event: 'error', listener: ErrorListener): this;
    on(event: 'congestion', listener: () => void): this;
    on(event: 'writable', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export interface UnixDgram {
    createSocket(type: 'unix_dgram', listener?: MessageListener): Socket;
  }

  const unix: UnixDgram;
  export = unix;
}
