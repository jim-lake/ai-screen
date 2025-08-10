import { Terminal } from './terminal';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface SessionData {
  name: string;
  pid: number;
  created: number;
}

export class Session {
  private static readonly sessionsDir = path.join(
    os.tmpdir(),
    'ai-screen-sessions'
  );

  public name: string;
  public terminals: Terminal[] = [];
  private counter = 0;

  public constructor(name: string) {
    this.name = name;
    this.ensureSessionsDir();
  }

  public static listSessions(): SessionData[] {
    if (!fs.existsSync(Session.sessionsDir)) {
      return [];
    }

    const sessions: SessionData[] = [];
    const files = fs.readdirSync(Session.sessionsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const session_file = path.join(Session.sessionsDir, file);
          const data: unknown = JSON.parse(
            fs.readFileSync(session_file, 'utf8')
          );

          // Type guard to ensure data has the expected structure
          if (this.isSessionData(data)) {
            // Check if process is still running
            try {
              process.kill(data.pid, 0);
              sessions.push(data);
            } catch {
              // Process is dead, remove the session file
              fs.unlinkSync(session_file);
            }
          }
        } catch {
          // Invalid session file, skip
        }
      }
    }

    return sessions;
  }

  public static cleanupSession(name: string): void {
    const session_file = path.join(Session.sessionsDir, `${name}.json`);
    if (fs.existsSync(session_file)) {
      fs.unlinkSync(session_file);
    }
  }

  private static isSessionData(data: unknown): data is SessionData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      'pid' in data &&
      'created' in data &&
      typeof (data as SessionData).name === 'string' &&
      typeof (data as SessionData).pid === 'number' &&
      typeof (data as SessionData).created === 'number'
    );
  }

  public createTerminal(command?: string[]): Terminal {
    const terminal = new Terminal(this.counter++, command);
    this.terminals.push(terminal);
    return terminal;
  }

  public detach(): void {
    // Save session info to filesystem
    this.saveSessionInfo();
    // eslint-disable-next-line no-console
    console.log(`[detached from ${this.name}]`);
  }

  private ensureSessionsDir(): void {
    if (!fs.existsSync(Session.sessionsDir)) {
      fs.mkdirSync(Session.sessionsDir, { recursive: true });
    }
  }

  private saveSessionInfo(): void {
    const session_data: SessionData = {
      name: this.name,
      pid: process.pid,
      created: Date.now(),
    };

    const session_file = path.join(Session.sessionsDir, `${this.name}.json`);
    fs.writeFileSync(session_file, JSON.stringify(session_data, null, 2));
  }
}
