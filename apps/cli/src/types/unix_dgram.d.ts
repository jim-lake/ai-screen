/* eslint-disable @typescript-eslint/method-signature-style */

declare module 'unix-dgram' {
  export interface RInfo {
    path?: string;
    size?: number;
    fds?: number[];
  }

  export type MessageListener = (msg: Buffer, rinfo?: RInfo) => void;
  export type ErrorListener = (err: Error) => void;
  export type ListeningListener = (path: string) => void;
  export type ConnectListener = (path: string) => void;

  export interface Socket {
    bind(path: string): void;
    connect(path: string): void;
    send(
      buf: Buffer,
      fds?: number[],
      callback?: (err: Error | null) => void
    ): void;
    sendto(
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
    on(event: 'congestion' | 'writable', listener: () => void): this;
  }

  export interface UnixDgram {
    createSocket(type: 'unix_dgram', listener?: MessageListener): Socket;
  }

  const unix: UnixDgram;
  export default unix;
}
