import { Client, getClient } from './client';
import { Terminal } from './terminal';
import type { ClientParams } from './client';
import type { TerminalParams } from './terminal';

import { errorLog } from '../tools/log';

export interface SessionParams extends TerminalParams {
  name: string;
}
export type ConnectParams = ClientParams & { rows: number; columns: number };

const g_sessionMap = new Map<string, Session>();

export function listSessions() {
  return [...g_sessionMap.values()];
}
export function getSession(name: string): Session | undefined {
  return g_sessionMap.get(name);
}
export class Session {
  public name: string;
  public created: Date;
  public clients: Client[] = [];
  public activeTerminal: Terminal | null = null;
  public terminals: Terminal[] = [];
  public terminalParams: TerminalParams;

  public constructor(params: SessionParams) {
    const { name, ...other } = params;
    if (g_sessionMap.has(name)) {
      throw new Error('conflict');
    }
    this.created = new Date();
    this.name = name;
    this.terminalParams = other;
    g_sessionMap.set(name, this);
  }
  public createTerminal(params?: Partial<TerminalParams>): Terminal {
    const opts = Object.assign({}, this.terminalParams, params);
    const terminal = new Terminal(opts);
    terminal.on('data', this._onTerminalData.bind(this, terminal));
    terminal.on('exit', this._onTerminalExit.bind(this, terminal));
    this.terminals.push(terminal);
    this.activeTerminal = terminal;
    return terminal;
  }
  public connectClient(params: ConnectParams) {
    const { rows, columns, ...other } = params;
    const client = new Client(other);
    this.clients.push(client);
    this.terminalParams.rows = rows;
    this.terminalParams.columns = columns;
    if (this.terminals.length === 0) {
      this.createTerminal();
    } else {
      this.resize({ rows, columns });
    }
    return client;
  }
  public resize(params: { rows: number; columns: number }) {
    for (const terminal of this.terminals) {
      terminal.resize(params);
    }
  }
  public write(data: string) {
    this.activeTerminal?.write(data);
  }
  public detach(path: string) {
    const client = getClient(path);
    if (client) {
      const index = this.clients.indexOf(client);
      if (index !== -1) {
        this.clients.splice(index, 1);
      }
      client.disconnect('detach');
    }
  }
  public activateTerminal(index: number) {
    const new_term = this.terminals[index];
    if (new_term) {
      this.activeTerminal = new_term;
      for (const client of this.clients) {
        client.changeTerminal(new_term);
      }
    } else {
      errorLog('Session.activeTerminal:  unknown terminal index:', index);
    }
  }
  public close() {
    for (const client of this.clients) {
      client.disconnect('close');
    }
    this.clients = [];
    for (const term of this.terminals) {
      term.removeAllListeners();
    }
    this.terminals = [];
    this.activeTerminal = null;
    g_sessionMap.delete(this.name);
  }
  private _onTerminalData(term: Terminal, data: string) {
    if (term === this.activeTerminal) {
      for (const client of this.clients) {
        client.write(data);
      }
    }
  }
  private _onTerminalExit(term: Terminal) {
    const index = this.terminals.indexOf(term);
    if (index !== -1) {
      this.terminals.splice(index, 1);
      if (this.terminals.length === 0) {
        this.close();
      } else if (this.activeTerminal === term) {
        const new_index = index >= this.terminals.length ? 0 : index;
        this.activateTerminal(new_index);
      }
    }
    term.removeAllListeners();
  }
}
export default { listSessions, getSession, Session };
