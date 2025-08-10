#!/usr/bin/env node
import { Command } from 'commander';
import {
  listActiveSessions,
  runSessionInBackground,
  reattachToSession,
  startNewSession,
} from './index';

const OPTS = [
  { flags: '-ls, --list', description: 'list running sessions', key: 'list' },
  {
    flags: '-r [session]',
    description: 'reattach to a detached screen process',
    key: 'r',
  },
  {
    flags: '-S <sockname>',
    description:
      'name this session <pid>.sockname instead of <pid>.<tty>.<host>',
    key: 'S',
  },
  {
    flags: '--timeout <seconds>',
    description: 'exit after N seconds (for testing)',
    key: 'timeout',
  },
  {
    flags: '--background <session>',
    description: 'run session in background (internal use)',
    key: 'background',
  },
  {
    flags: '-a',
    description: "force all capabilities into each window's termcap",
    key: 'a',
  },
  {
    flags: '-A',
    description: 'adapt all windows to the new display width & height',
    key: 'A',
  },
  {
    flags: '-c <file>',
    description: "read configuration file instead of '.screenrc'",
    key: 'c',
  },
  {
    flags: '-d [session]',
    description: 'detach the elsewhere running screen (and reattach here)',
    key: 'd',
  },
  {
    flags: '-dmS <n>',
    description: 'start as daemon: Screen session in detached mode',
    key: 'dmS',
  },
  {
    flags: '-D [session]',
    description: 'detach and logout remote (and reattach here)',
    key: 'D',
  },
  { flags: '-e <xy>', description: 'change command characters', key: 'e' },
  {
    flags: '-f',
    description: 'flow control on, -fn = off, -fa = auto',
    key: 'f',
  },
  { flags: '-fn', description: 'flow control off', key: 'fn' },
  { flags: '-fa', description: 'flow control auto', key: 'fa' },
  {
    flags: '-h <lines>',
    description: 'set the size of the scrollback history buffer',
    key: 'h',
  },
  {
    flags: '-i',
    description: 'interrupt output sooner when flow control is on',
    key: 'i',
  },
  { flags: '-L', description: 'turn on output logging', key: 'L' },
  {
    flags: '-m',
    description: 'ignore $STY variable, do create a new screen session',
    key: 'm',
  },
  {
    flags: '-O',
    description: 'choose optimal output rather than exact vt100 emulation',
    key: 'O',
  },
  {
    flags: '-p <window>',
    description: 'preselect the named window if it exists',
    key: 'p',
  },
  {
    flags: '-q',
    description:
      'quiet startup. Exits with non-zero return code if unsuccessful',
    key: 'q',
  },
  {
    flags: '-R [session]',
    description: 'reattach if possible, otherwise start a new session',
    key: 'R',
  },
  {
    flags: '-RR [session]',
    description: 'reattach if possible, otherwise start a new session',
    key: 'RR',
  },
  {
    flags: '-s <shell>',
    description: 'shell to execute rather than $SHELL',
    key: 's',
  },
  { flags: '-t <title>', description: "set title (window's name)", key: 't' },
  {
    flags: '-T <term>',
    description: 'use term as $TERM for windows, rather than "screen"',
    key: 'T',
  },
  { flags: '-U', description: 'tell screen to use UTF-8 encoding', key: 'U' },
  { flags: '-v, --version', description: 'print version', key: 'version' },
  {
    flags: '-wipe [session]',
    description: 'do nothing, just clean up SockDir',
    key: 'wipe',
  },
  {
    flags: '-x [session]',
    description: 'attach to a not detached screen (multi display mode)',
    key: 'x',
  },
  {
    flags: '-X',
    description: 'execute <cmd> as a screen command in the specified session',
    key: 'X',
  },
] as const;

type InferTypeFromFlags<T extends string> = T extends `${string}<${string}>`
  ? string
  : T extends `${string}[${string}]`
    ? string
    : boolean;

type CliOptions = {
  [K in (typeof OPTS)[number] as K['key']]?: InferTypeFromFlags<K['flags']>;
};

function _createProgram(): Command {
  const program = new Command();

  program
    .description('A modern screen emulator for the ai age.')
    .usage('[-opts] [cmd [args]]')
    .addHelpText(
      'before',
      'Use: ai-screen [-opts] [cmd [args]]\n or: ai-screen -r [host.tty]\n'
    );

  OPTS.forEach((option) => {
    program.option(option.flags, option.description);
  });
  program.argument('[command...]');

  return program;
}

const g_program = _createProgram();
g_program.action((command: string[], options: CliOptions) => {
  if (options.version) {
    _version();
    return;
  }

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
  if (options.dmS) {
    _unsupported('-dmS');
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
  if (options.q) {
    _unsupported('-q');
  }
  if (options.R !== undefined) {
    _unsupported('-R');
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

  if (options.list) {
    listActiveSessions();
    return;
  } else if (options.background) {
    runSessionInBackground(options.background, command);
    return;
  } else if (options.r !== undefined) {
    reattachToSession(options.r);
    return;
  }

  const session_name = options.S ?? 'default';
  startNewSession(session_name, command, options.timeout);
});
g_program.parse();

function _version(): void {
  // eslint-disable-next-line no-console
  console.log('ai-screen version 0.0.1');
}
function _unsupported(flag_name: string): void {
  // eslint-disable-next-line no-console
  console.error(`Error: Flag '${flag_name}' is not yet supported in ai-screen`);
  process.exit(1);
}
