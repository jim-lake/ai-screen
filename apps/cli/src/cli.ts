#!/usr/bin/env node
import { Command } from 'commander';

import { CLI_OPTIONS } from './cli_options';
import { CliExitCode } from './cli_exit_code';
import {
  setupClient,
  getSessions,
  ensureServer,
  startServer,
  killServer,
  createSession,
  connectSession,
} from './index';

import { log, errorLog, setQuiet } from './tools/log';

import type { CliOptions } from './cli_options';
import type { ConnectParams, SessionParams } from './index';

const DEFAULT_PORT = 6847;
const DEFAULT_SHELL = 'bash';

function _createProgram(): Command {
  const program = new Command();
  program
    .name('ai-screen')
    .usage('[-opts] [cmd [args]]')
    .addHelpText(
      'before',
      'Use: ai-screen [-opts] [cmd [args]]\n or: ai-screen -r [host.tty]\n'
    );
  CLI_OPTIONS.forEach((option) => {
    program.option(option.flags, option.description);
  });
  program.argument('[command...]');
  return program;
}

const g_program = _createProgram();
g_program.action(async (command: string[], options: CliOptions) => {
  let error_prefix: string | undefined;
  let port = DEFAULT_PORT;

  try {
    if (options.version) {
      log(`ai-screen version ${globalThis.__VERSION__ ?? 'dev'} (ai-screen)`);
      return;
    }
    if (options.q) {
      setQuiet(true);
    }
    if (options.serverPort) {
      port = parseInt(options.serverPort);
    }
    setupClient({ port });

    if (options.a) {
      _unsupported('-a');
    }
    if (options.A) {
      _unsupported('-A');
    }
    if (options.c) {
      _unsupported('-c');
    }
    if (options.d !== undefined) {
      _unsupported('-d');
    }
    if (options.D !== undefined) {
      _unsupported('-D');
    }
    if (options.e) {
      _unsupported('-e');
    }
    if (options.f) {
      _unsupported('-f');
    }
    if (options.fn) {
      _unsupported('-fn');
    }
    if (options.fa) {
      _unsupported('-fa');
    }
    if (options.h) {
      _unsupported('-h');
    }
    if (options.i) {
      _unsupported('-i');
    }
    if (options.L) {
      _unsupported('-L');
    }
    if (options.m) {
      _unsupported('-m');
    }
    if (options.O) {
      _unsupported('-O');
    }
    if (options.p) {
      _unsupported('-p');
    }
    if (options.RR !== undefined) {
      _unsupported('-RR');
    }
    if (options.s) {
      _unsupported('-s');
    }
    if (options.t) {
      _unsupported('-t');
    }
    if (options.T) {
      _unsupported('-T');
    }
    if (options.U) {
      _unsupported('-U');
    }
    if (options.wipe !== undefined) {
      _unsupported('--wipe');
    }
    if (options.x !== undefined) {
      _unsupported('-x');
    }
    if (options.X) {
      _unsupported('-X');
    }

    if (options.DmS) {
      error_prefix = 'create session';
      await createSession(_sessionParams({ name: options.DmS }));
      log('created detached session:', options.DmS);
      return;
    } else if (options.server) {
      error_prefix = 'start server';
      const result = await startServer({
        foreground: options.foreground ?? false,
        port,
      });
      log('server launched on pid:', result.pid, 'port:', result.port);
      return;
    } else if (options.killServer) {
      error_prefix = 'kill server';
      await killServer();
      log('server killed');
      return;
    } else if (options.list) {
      error_prefix = 'list sessions';
      const session_list = await getSessions();
      if (session_list.length === 0) {
        log('No sessions found');
      } else {
        _printSessions(session_list);
      }
      return;
    } else if (options.r !== undefined || options.R !== undefined) {
      let name = '';
      if (typeof options.R === 'string') {
        name = options.R;
        const session_list = await getSessions();
        const found = session_list.find((s) => s.sessionName === options.R);
        if (!found) {
          await createSession(_sessionParams({ name }));
        }
      } else if (typeof options.r === 'string') {
        name = options.r;
      }

      if (!name) {
        const session_list = await getSessions();
        const detached = session_list.filter(
          (s) => !s.clients.some((c) => c.exclusive)
        );
        if (detached.length === 1 && detached[0]) {
          name = detached[0].sessionName;
        } else if (detached.length === 0 && options.R !== undefined) {
          name = _defaultSessionName();
          await createSession(_sessionParams({ name }));
        } else {
          if (session_list.length > 0) {
            _printSessions(session_list);
          }
          if (detached.length === 0) {
            log('There is no screen to be resumed.');
            process.exit(CliExitCode.NO_DETATCHED_SESSION);
          } else {
            log('Type "ai-screen [-d] -r <name> to resume one of them.');
            process.exit(CliExitCode.MULTIPLE_CANDIDATE_SESSIONS);
          }
          return;
        }
      }
      await _connect({
        name,
        stdin: process.stdin,
        stdout: process.stdout,
        exclusive: true,
      });
      return;
    } else if (Object.keys(options).length === 0) {
      error_prefix = 'create and attach session';
      const name = _defaultSessionName();
      await ensureServer({ port });
      await createSession(_sessionParams({ name }));
      await _connect({
        name,
        stdin: process.stdin,
        stdout: process.stdout,
        exclusive: true,
      });
      return;
    } else {
      const flag_name = Object.keys(options)[0];
      errorLog(`Error: Flag '${flag_name}' is not yet supported in ai-screen`);
      process.exit(CliExitCode.UNKNOWN_ERROR);
      return;
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'ALREADY_RUNNING') {
        errorLog('Server already running.');
      } else if (e.message === 'NO_SERVER') {
        errorLog('Server not running.');
      } else if (e.message === 'SESSION_CONFLICT') {
        errorLog('Session with that name already exists.');
      } else if (e.message === 'NO_DETATCHED_SESSION') {
        errorLog('There is no detached screen to be resumed.');
      } else if (e.message === 'SESSION_NOT_FOUND') {
        errorLog('There is no screen to be resumed matching that name.');
      } else if (e.message === 'SESSION_ALREADY_CONNECTED') {
        errorLog('There is no detached screen to be resumed.');
      } else {
        errorLog(error_prefix ?? 'Unknown error:', 'err:', e);
      }
      if (e.message in CliExitCode) {
        return process.exit(CliExitCode[e.message as keyof typeof CliExitCode]);
      }
      return process.exit(CliExitCode.UNKNOWN_ERROR);
    }
    errorLog(error_prefix ?? 'ai-screen unknown', 'err:', e);
    return process.exit(CliExitCode.UNKNOWN_ERROR);
  }
});
g_program.parse();

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeStyle: 'long',
});
type Unpromised<T extends (...args: unknown[]) => Promise<unknown>> =
  ReturnType<T> extends Promise<infer U> ? U : never;
function _printSessions(list: Unpromised<typeof getSessions>) {
  log('Sessions found:');
  for (const session of list) {
    const att = session.clients.length > 0 ? 'Attached' : 'Detached';
    const ex = session.clients.some((c) => c.exclusive) ? ', Exclusive' : '';
    log(
      `  ${session.sessionName} (${FORMATTER.format(new Date(session.created))}) (${att}${ex})`
    );
  }
}
function _defaultSessionName() {
  return `default-${process.pid}`;
}
async function _connect(params: ConnectParams) {
  const { reason } = await connectSession(params);
  if (reason === 'close') {
    log('\n[session is terminating]');
  } else if (reason === 'detach') {
    log('\n[detached]');
  } else {
    log('\nfinished for reason:', reason);
  }
}
function _sessionParams(params: Partial<SessionParams>): SessionParams {
  return Object.assign(
    {
      name: `default-${process.pid}`,
      cwd: process.cwd(),
      shell: process.env.SHELL ?? DEFAULT_SHELL,
      env: process.env,
      rows: process.stdout.rows,
      columns: process.stdout.columns,
    },
    params
  );
}
function _unsupported(flag_name: string): void {
  errorLog(`Error: Flag '${flag_name}' is not yet supported in ai-screen`);
  process.exit(CliExitCode.UNKNOWN_ERROR);
}
