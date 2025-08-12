import { Terminal } from './terminal';
import type { TerminalParams } from './terminal';

export interface SessionParams extends TerminalParams {
  name: string;
}

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
    this.terminals.push(terminal);
    return terminal;
  }
}

export default { listSessions, getSession, Session };
