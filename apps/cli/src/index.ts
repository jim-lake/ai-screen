import { Session } from './session';
import { spawn } from 'child_process';

export { Session } from './session';
export { Window } from './window';

export function listActiveSessions(): void {
  const sessions = Session.listSessions();
  if (sessions.length === 0) {
    console.log('No sessions found.');
  } else {
    console.log('Active sessions:');
    sessions.forEach((session) => {
      const date = new Date(session.created).toLocaleString();
      console.log(`  ${session.name}\t(${session.pid})\t${date}`);
    });
  }
}

export function runSessionInBackground(
  sessionName: string,
  command: string[]
): void {
  // Background mode - keep session alive without terminal I/O
  const session = new Session(sessionName);
  const window = session.createWindow(command);

  // Save session info
  session.detach();

  // Keep the process alive but don't interact with terminal
  // The session will remain in the background until the process exits
  window.process.onExit(() => {
    Session.cleanupSession(sessionName);
    process.exit(0);
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    Session.cleanupSession(sessionName);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    Session.cleanupSession(sessionName);
    process.exit(0);
  });
}

export function reattachToSession(sessionName?: string): void {
  const name = sessionName || 'default';
  console.log(`Reattaching to session '${name}' is not yet implemented.`);
}

export function startNewSession(
  sessionName: string,
  command: string[],
  timeoutSeconds?: string
): void {
  const session = new Session(sessionName);
  const window = session.createWindow(command);
  let isAttached = true;

  // Set up timeout if specified
  let timeoutId: NodeJS.Timeout | undefined;
  if (timeoutSeconds) {
    const timeout = parseInt(timeoutSeconds, 10);
    if (!isNaN(timeout) && timeout > 0) {
      timeoutId = setTimeout(() => {
        console.log(`\n[timeout after ${timeout} seconds]`);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        Session.cleanupSession(sessionName);
        process.exit(0);
      }, timeout * 1000);
    }
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle terminal resize
  process.stdout.on('resize', () => {
    if (isAttached) {
      window.resize(process.stdout.columns, process.stdout.rows);
    }
  });

  // Handle output from the window process
  window.process.onData((data: string) => {
    if (isAttached) {
      process.stdout.write(data);
    }
  });

  // Handle detach
  window.onDetach(() => {
    isAttached = false;
    session.detach();

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // Detach stdin/stdout
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('close');

    // Spawn a detached background process to keep the session alive
    const child = spawn(
      process.execPath,
      [__filename, '--background', sessionName],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();

    console.log(`[detached from ${sessionName}]`);
    process.exit(0);
  });

  // Handle input from stdin
  process.stdin.on('data', (data: Buffer) => {
    if (isAttached) {
      window.handleInput(data);
    }
  });

  // Handle stdin close (Ctrl+C, etc.)
  process.stdin.on('close', () => {
    if (isAttached) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      Session.cleanupSession(sessionName);
      process.exit(0);
    }
  });

  // Handle window process exit
  window.process.onExit(() => {
    if (isAttached) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      Session.cleanupSession(sessionName);
      process.exit();
    }
  });

  // Handle process termination signals
  process.on('SIGTERM', () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    Session.cleanupSession(sessionName);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    if (isAttached) {
      // Pass Ctrl+C to the window process
      window.process.write('\x03');
    }
  });
}
