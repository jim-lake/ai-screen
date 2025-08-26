import * as fs from 'node:fs';
import * as tty from 'node:tty';
import { EventEmitter } from 'node:events';
import { displayStateToAnsi } from '@ai-screen/shared';

import { log, errorLog } from '../tools/log';

import type { AnsiDisplayState, ClientJson } from '@ai-screen/shared';
import type { Writable } from 'node:stream';
import type { TerminalScreenState } from './terminal';

export interface ClientParams {
  path: string;
  exclusive: boolean;
  fd?: number;
}
export interface ConnectResult extends AnsiDisplayState {
  reason: string;
}
interface Size { rows: number, columns: number };
export interface ClientEvents {
  disconnect: (result: ConnectResult) => void;
  write: (data: string) => void;
  resize: (size: Size) => void;
}

const g_clientMap = new Map<string, Client>();

export function listClients() {
  return [...g_clientMap.values()];
}
export function getClient(name: string): Client | undefined {
  return g_clientMap.get(name);
}
export class Client extends EventEmitter {
  public readonly path: string;
  public readonly created: Date;
  public readonly exclusive: boolean;
  public readonly fd: number | null;
  public readonly stream: Writable | null;

  public constructor(params: ClientParams) {
    super();
    const { path } = params;
    if (g_clientMap.has(path)) {
      throw new Error('conflict');
    }
    this.created = new Date();
    this.path = path;
    this.exclusive = params.exclusive;
    this.fd = params.fd ?? null;
    if (this.fd && tty.isatty(this.fd)) {
      log('Client: connect tty:', this.fd);
      this.stream = new tty.WriteStream(this.fd);
    } else if (this.fd) {
      log('Client: connect fd:', this.fd);
      this.stream = fs.createWriteStream('', { fd: this.fd, autoClose: false });
    } else {
      this.stream = null;
    }
    this.stream?.on('close', this._onClose);
    this.stream?.on('error', this._onError);
    g_clientMap.set(path, this);
  }
  public write(data: string) {
    if (this.stream) {
      this.stream.write(data);
    } else {
      this.emit('write', data);
    }
  }
  public disconnect(result: ConnectResult) {
    this.stream?.removeAllListeners();
    this.stream?.destroy();
    this.emit('disconnect', result);
  }
  public changeTerminal(state: TerminalScreenState) {
    this.write(state.normal.buffer.join('\n'));
    this.write(displayStateToAnsi({ cursor: state.normal.cursor }));
    if (state.alternate) {
      this.write(displayStateToAnsi({ altScreen: true }));
      this.write(state.alternate.buffer.join('\n'));
      this.write(displayStateToAnsi({ cursor: state.alternate.cursor }));
    }
  }
  public resize(params: Size) {
    this.emit('resize', params);
  }
  public on<E extends keyof ClientEvents>(
    event: E,
    listener: ClientEvents[E]
  ): this {
    return super.on(event, listener);
  }
  public emit<E extends keyof ClientEvents>(
    event: E,
    ...args: Parameters<ClientEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
  public toJSON(): ClientJson {
    return {
      clientPath: this.path,
      created: this.created.toISOString(),
      fd: this.fd,
      exclusive: this.exclusive,
    };
  }
  private readonly _onClose = (e: unknown) => {
    log(`client(${this.path})._onClose:`, e);
  };
  private readonly _onError = (e: unknown) => {
    errorLog(`client(${this.path})._onError:`, e);
  };
}
export default { listClients, getClient, Client };
