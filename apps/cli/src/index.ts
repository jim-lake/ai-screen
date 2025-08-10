import { spawn } from 'node:child_process';

import { Session } from './session';

export { Session } from './session';
export { Terminal } from './terminal';

export function listActiveSessions(): void {
  const sessions = Session.listSessions();
  if (sessions.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No sessions found.');
  } else {
    // eslint-disable-next-line no-console
    console.log('Active sessions:');
    sessions.forEach((session) => {
      const date = new Date(session.created).toLocaleString();
      // eslint-disable-next-line no-console
      console.log(`  ${session.name}\t(${session.pid})\t${date}`);
    });
  }
}

export function runSessionInBackground(
  session_name: string,
  command: string[]
): void {
  // Background mode - keep session alive without terminal I/O
  const session = new Session(session_name);
  const terminal = session.createTerminal(command);

  // Save session info
  session.detach();

  // Keep the process alive but don't interact with terminal
  // The session will remain in the background until the process exits
  terminal.process.onExit(() => {
    Session.cleanupSession(session_name);
    process.exit(0);
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    Session.cleanupSession(session_name);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    Session.cleanupSession(session_name);
    process.exit(0);
  });
}

export function reattachToSession(session_name?: string): void {
  const name = session_name ?? 'default';
  // eslint-disable-next-line no-console
  console.log(`Reattaching to session '${name}' is not yet implemented.`);
}

export function startNewSession(
  session_name: string,
  command: string[],
  timeout_seconds?: string
): void {
  const session = new Session(session_name);
  const terminal = session.createTerminal(command);
  let is_attached = true;

  // Set up timeout if specified
  let timeout_id: NodeJS.Timeout | undefined;
  if (timeout_seconds) {
    const timeout = parseInt(timeout_seconds, 10);
    if (!isNaN(timeout) && timeout > 0) {
      timeout_id = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(`\n[timeout after ${timeout} seconds]`);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        Session.cleanupSession(session_name);
        process.exit(0);
      }, timeout * 1000);
    }
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle terminal resize
  process.stdout.on('resize', () => {
    if (is_attached) {
      terminal.resize(process.stdout.columns, process.stdout.rows);
    }
  });

  // Handle output from the terminal process
  terminal.process.onData((data: string) => {
    if (is_attached) {
      process.stdout.write(data);
    }
  });

  // Handle detach
  terminal.onDetach(() => {
    is_attached = false;
    session.detach();

    if (timeout_id) {
      clearTimeout(timeout_id);
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
      [__filename, '--background', session_name],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();

    // eslint-disable-next-line no-console
    console.log(`[detached from ${session_name}]`);
    process.exit(0);
  });

  // Handle input from stdin
  process.stdin.on('data', (data: Buffer) => {
    if (is_attached) {
      terminal.handleInput(data);
    }
  });

  // Handle stdin close (Ctrl+C, etc.)
  process.stdin.on('close', () => {
    if (is_attached) {
      if (timeout_id) {
        clearTimeout(timeout_id);
      }
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      Session.cleanupSession(session_name);
      process.exit(0);
    }
  });

  // Handle terminal process exit
  terminal.process.onExit(() => {
    if (is_attached) {
      if (timeout_id) {
        clearTimeout(timeout_id);
      }
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      Session.cleanupSession(session_name);
      process.exit();
    }
  });

  // Handle process termination signals
  process.on('SIGTERM', () => {
    if (timeout_id) {
      clearTimeout(timeout_id);
    }
    Session.cleanupSession(session_name);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    if (is_attached) {
      // Pass Ctrl+C to the terminal process
      terminal.process.write('\x03');
    }
  });
}
