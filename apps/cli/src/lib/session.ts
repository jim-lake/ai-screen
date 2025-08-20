import { Client, getClient } from './client';
import { Terminal } from './terminal';

import { errorLog } from '../tools/log';

import type { ClientParams, ClientJson } from './client';
import type {
  TerminalExitEvent,
  TerminalParams,
  TerminalJson,
} from './terminal';
import type { AnsiDisplayState } from '../tools/ansi';

export interface SessionJson {
  name: string;
  created: string;
  client_list: ClientJson[];
  terminal_params: { rows: number; columns: number };
  terminal_list: TerminalJson[];
  active_terminal: TerminalJson | null;
}
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
      this.createTerminal(params);
    } else {
      this.resize({ rows, columns });
      if (this.activeTerminal) {
        const state = this.activeTerminal.getScreenState();
        client.changeTerminal(state);
      }
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
      const state = this.activeTerminal?.getAnsiDisplayState();
      client.disconnect({ reason: 'detach', ...state });
    }
  }
  public activateTerminal(index: number) {
    const new_term = this.terminals[index];
    if (new_term) {
      this.activeTerminal = new_term;
      const state = this.activeTerminal.getScreenState();
      for (const client of this.clients) {
        client.changeTerminal(state);
      }
    } else {
      errorLog('Session.activeTerminal:  unknown terminal index:', index);
    }
  }
  public close(state?: AnsiDisplayState) {
    state ??= this.activeTerminal?.getAnsiDisplayState();
    for (const client of this.clients) {
      client.disconnect({ reason: 'close', ...state });
    }
    this.clients = [];
    for (const term of this.terminals) {
      term.removeAllListeners();
    }
    this.terminals = [];
    this.activeTerminal = null;
    g_sessionMap.delete(this.name);
  }
  public toJSON(): SessionJson {
    return {
      name: this.name,
      created: this.created.toISOString(),
      client_list: this.clients.map((c) => c.toJSON()),
      terminal_params: {
        rows: this.terminalParams.rows,
        columns: this.terminalParams.columns,
      },
      terminal_list: this.terminals.map((t) => t.toJSON()),
      active_terminal:
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
