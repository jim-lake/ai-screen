import { fork } from 'node:child_process';
import { getSessions, quitServer } from './client';
import server from './server';

import { log, errorLog, debugLog } from './tools/log';

export default { listSessions, startServer };

const START_TIMEOUT = 10 * 1000;

export async function listSessions() {
  const result = await getSessions();
  if (result.err?.code === 'NO_SERVER') {
    errorLog('server not running.');
  } else if (result.err) {
    errorLog('failed to get sessions:', result.err);
  } else if (result.session_list.length === 0) {
    log('No sessions found.');
  } else {
    log('Active sessions:');
    for (const session of result.session_list) {
      const date = new Date(session.created).toLocaleString();
      log(`  ${session.name}\t${date}`);
    }
  }
}
export async function startServer(foreground: boolean) {
  if (foreground) {
    const result = await server.start();
    if (result.err?.code === 'EADDRINUSE') {
      errorLog('failed to start server, already running.');
    } else if (result.err) {
      errorLog('failed to start server:', result.err);
    } else {
      try {
        process.on('error', _ignoreError);
        process.send?.({
          event: 'started',
          port: result.port,
          sock_path: result.sock_path,
        });
        //process.off('error', _ignoreError);
      } catch (e) {
        errorLog('process.send threw:', e);
      }
      log(
        'started server on port:',
        result.port,
        'sock_path:',
        result.sock_path
      );
    }
  } else {
    try {
      await _startBackground();
    } catch (e) {
      errorLog('failed to start server:', e);
    }
  }
}
async function _startBackground(): Promise<void> {
  return new Promise((resolve, reject) => {
    const opts: Parameters<typeof fork>[2] = {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    };
    const child = fork(process.argv[1], ['--server', '--foreground'], opts);
    child.on('spawn', () => {
      log('server forked:', child.pid);
    });
    child.once('message', (msg) => {
      log('server message:', msg);
      child.channel?.unref();
      child.unref();
      resolve();
    });
    child.once('error', (e) => {
      errorLog('failed to fork server:', e);
      reject(new Error('exit'));
    });
    child.once('exit', () => {
      reject(new Error('exit'));
    });
    setTimeout(() => {
      reject(new Error('timeout'));
    }, START_TIMEOUT);
  });
}
export async function killServer() {
  const err = await quitServer();
  if (err?.code === 'NO_SERVER') {
    log('server not running.');
  } else if (err) {
    errorLog('failed to kill server:', err);
  } else {
    log('server killed.');
  }
}
export async function createSession(name: string) {
  const result = await getSessions();
  if (result.err?.code === 'NO_SERVER') {
    errorLog('server not running.');
  } else if (result.err) {
    errorLog('failed to get current sessions');
  } else if (result.session_list.find((s) => s.name === name)) {
    log('session exists');
  }
}

/*
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
*/
/*
export function reattachToSession(session_name?: string): void {
  const name = session_name ?? 'default';
  // eslint-disable-next-line no-console
  console.log(`Reattaching to session '${name}' is not yet implemented.`);
}
*/
/*
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
*/
function _ignoreError(e: Error) {
  debugLog('_ignoreError: e:', e);
}
