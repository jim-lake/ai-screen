import { Client, getClient } from './client';
import { Terminal } from './terminal';

import { log, errorLog } from '../tools/log';

import type { AnsiDisplayState, SessionJson } from '@ai-screen/shared';
import type { ClientParams } from './client';
import type { TerminalExitEvent, TerminalParams } from './terminal';

export interface SessionParams extends TerminalParams {
  name: string;
}
export type ConnectParams = ClientParams & { rows?: number; columns?: number };
interface Size {
  rows: number;
  columns: number;
}

const g_sessionMap = new Map<string, Session>();

export function listSessions() {
  return [...g_sessionMap.values()];
}
export function getSession(name: string): Session | undefined {
  return g_sessionMap.get(name);
}
export class Session {
  public readonly name: string;
  public readonly created: Date;
  public readonly clients: Client[] = [];
  public activeTerminal: Terminal | null = null;
  public readonly terminals: Terminal[] = [];
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
    if (params.exclusive) {
      if (this.clients.some((c) => c.exclusive)) {
        throw new Error('conflict');
      }
    }
    if (rows && columns) {
      this.resize({ rows, columns });
    }
    const client = new Client(other);
    this.clients.push(client);
    if (this.terminals.length === 0) {
      this.createTerminal(params);
    } else {
      if (this.activeTerminal) {
        const state = this.activeTerminal.getScreenState();
        client.changeTerminal(null, state);
      }
    }
    return client;
  }
  public resize(params: Size) {
    for (const terminal of this.terminals) {
      terminal.resize(params);
    }
    for (const client of this.clients) {
      client.resize(params);
    }
    this.terminalParams.rows = params.rows;
    this.terminalParams.columns = params.columns;
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
      const state = this.activeTerminal?.getAnsiDisplayState();
      if (state) {
        client.disconnect({ reason: 'detach', ...state });
      }
    }
  }
  public activateTerminal(index: number) {
    const new_term = this.terminals[index];
    if (new_term && this.activeTerminal === new_term) {
      log('Session.activeTerminal: no change');
    } else if (new_term) {
      const old_state = this.activeTerminal?.getAnsiDisplayState() ?? null;
      this.activeTerminal = new_term;
      const state = this.activeTerminal.getScreenState();
      for (const client of this.clients) {
        client.changeTerminal(old_state, state);
      }
    } else {
      errorLog('Session.activeTerminal:  unknown terminal index:', index);
    }
  }
  public close(state?: AnsiDisplayState) {
    state ??= this.activeTerminal?.getAnsiDisplayState();
    if (state) {
      for (const client of this.clients) {
        client.disconnect({ reason: 'close', ...state });
      }
    }
    this.clients.splice(0);
    for (const term of this.terminals) {
      term.removeAllListeners();
    }
    this.terminals.splice(0);
    this.activeTerminal = null;
    g_sessionMap.delete(this.name);
  }
  public toJSON(): SessionJson {
    return {
      sessionName: this.name,
      created: this.created.toISOString(),
      clients: this.clients.map((c) => c.toJSON()),
      terminalParams: {
        rows: this.terminalParams.rows,
        columns: this.terminalParams.columns,
      },
      terminals: this.terminals.map((t) => ({ terminalId: t.id })),
      activeTerminal:
        this.activeTerminal === null ? null : this.activeTerminal.toJSON(),
    };
  }
  private _onTerminalData(term: Terminal, data: string) {
    if (term === this.activeTerminal) {
      for (const client of this.clients) {
        client.write(data);
      }
    }
  }
  private _onTerminalExit(term: Terminal, event: TerminalExitEvent) {
    const index = this.terminals.indexOf(term);
    if (index !== -1) {
      this.terminals.splice(index, 1);
      if (this.terminals.length === 0) {
        this.close(event);
      } else if (this.activeTerminal === term) {
        if (this.terminals.length > 0) {
          const new_index = index >= this.terminals.length ? 0 : index;
          this.activateTerminal(new_index);
        }
      }
    }
    term.removeAllListeners();
    term.destroy();
  }
}
export default { listSessions, getSession, Session };
