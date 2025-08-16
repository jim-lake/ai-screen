import * as fs from 'node:fs';
import * as tty from 'node:tty';
import { EventEmitter } from 'node:events';

import type { Terminal } from './terminal';
import { log, errorLog } from '../tools/log';

import type { Writable } from 'node:stream';

export interface ClientParams {
  path: string;
  fd?: number;
}
export interface ClientEvents {
  disconnect: (reason: string) => void;
}

const g_clientMap = new Map<string, Client>();

export function listClients() {
  return [...g_clientMap.values()];
}
export function getClient(name: string): Client | undefined {
  return g_clientMap.get(name);
}
export class Client extends EventEmitter {
  public path: string;
  public created: Date;
  public fd: number | null;
  public stream: Writable | null;

  public constructor(params: ClientParams) {
    super();
    const { path } = params;
    if (g_clientMap.has(path)) {
      throw new Error('conflict');
    }
    this.created = new Date();
    this.path = path;
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
    this.stream?.write(data);
  }
  public disconnect(reason: string) {
    this.stream?.removeAllListeners();
    this.stream?.destroy();
    this.emit('disconnect', reason);
  }
  public changeTerminal(new_term: Terminal) {
    log('client.changeTerminal:', new_term.id);
    const screen_state = new_term.getScreenState();
    this.write(screen_state.content);
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
  private readonly _onClose = (e: unknown) => {
    log(`client(${this.path})._onClose:`, e);
  };
  private readonly _onError = (e: unknown) => {
    errorLog(`client(${this.path})._onError:`, e);
  };
}
export default { listClients, getClient, Client };
