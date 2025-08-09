import { Window } from './window';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface SessionData {
  name: string;
  pid: number;
  created: number;
}

export class Session {
  public name: string;
  public windows: Window[] = [];
  private windowCounter = 0;
  private static readonly sessionsDir = path.join(
    os.tmpdir(),
    'ai-screen-sessions'
  );

  public constructor(name: string) {
    this.name = name;
    this.ensureSessionsDir();
  }

  public createWindow(command?: string[]): Window {
    const window = new Window(this.windowCounter++, command);
    this.windows.push(window);
    return window;
  }

  public detach(): void {
    // Save session info to filesystem
    this.saveSessionInfo();
    console.log(`[detached from ${this.name}]`);
  }

  private ensureSessionsDir(): void {
    if (!fs.existsSync(Session.sessionsDir)) {
      fs.mkdirSync(Session.sessionsDir, { recursive: true });
    }
  }

  private saveSessionInfo(): void {
    const sessionData: SessionData = {
      name: this.name,
      pid: process.pid,
      created: Date.now(),
    };

    const sessionFile = path.join(Session.sessionsDir, `${this.name}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
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
          const sessionFile = path.join(Session.sessionsDir, file);
          const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

          // Check if process is still running
          try {
            process.kill(data.pid, 0);
            sessions.push(data);
          } catch {
            // Process is dead, remove the session file
            fs.unlinkSync(sessionFile);
          }
        } catch (error) {
          // Invalid session file, skip
        }
      }
    }

    return sessions;
  }

  public static cleanupSession(name: string): void {
    const sessionFile = path.join(Session.sessionsDir, `${name}.json`);
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
  }
}
