import { Terminal } from './terminal';

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
  private counter = 0;

  public constructor(name: string) {
    if (g_sessionMap.has(name)) {
      throw new Error('conflict');
    }
    this.name = name;
    this.created = new Date();
    g_sessionMap.set(name, this);
  }
  public createTerminal(command?: string[]): Terminal {
    const terminal = new Terminal(this.counter++, command);
    this.terminals.push(terminal);
    return terminal;
  }
}

export default { listSessions, getSession, Session };
