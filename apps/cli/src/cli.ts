#!/usr/bin/env node

import { Command } from 'commander';
import {
  listSessions,
  startServer,
  killServer,
  createSession,
  //runSessionInBackground,
  //reattachToSession,
  //startNewSession,
} from './index';
import { log, errorLog, setQuiet } from './tools/log';

const OPTS = [
  {
    flags: '-a',
    description: "Force all capabilities into each window's termcap.",
    key: 'a',
  },
  {
    flags: '-A',
    description: 'Adapt all windows to the new display width & height.',
    key: 'A',
  },
  {
    flags: '-c <file>',
    description: "Read configuration file instead of '.screenrc'.",
    key: 'c',
  },
  {
    flags: '-d [session]',
    description: 'Detach the elsewhere running screen (and reattach here).',
    key: 'd',
  },
  {
    flags: '-dmS <name>',
    description: 'Start as daemon: Screen session in detached mode.',
    key: 'DmS',
  },
  {
    flags: '-D [session]',
    description: 'Detach and logout remote (and reattach here).',
    key: 'D',
  },
  { flags: '-e <xy>', description: 'Change command characters.', key: 'e' },
  {
    flags: '-f',
    description: 'Flow control on, -fn = off, -fa = auto.',
    key: 'f',
  },
  { flags: '-fn', description: 'Flow control off.', key: 'fn' },
  { flags: '-fa', description: 'Flow control auto.', key: 'fa' },
  {
    flags: '-h <lines>',
    description: 'Set the size of the scrollback history buffer.',
    key: 'h',
  },
  {
    flags: '-i',
    description: 'Interrupt output sooner when flow control is on.',
    key: 'i',
  },
  {
    flags: '-ls, --list',
    description: 'Do nothing, just list our SockDir.',
    key: 'list',
  },
  { flags: '-L', description: 'Turn on output logging.', key: 'L' },
  {
    flags: '-m',
    description: 'ignore $STY variable, do create a new screen session.',
    key: 'm',
  },
  {
    flags: '-O',
    description: 'Choose optimal output rather than exact vt100 emulation.',
    key: 'O',
  },
  {
    flags: '-p <window>',
    description: 'Preselect the named window if it exists.',
    key: 'p',
  },
  {
    flags: '-q',
    description:
      'Quiet startup. Exits with non-zero return code if unsuccessful.',
    key: 'q',
  },
  {
    flags: '-r [session]',
    description: 'Reattach to a detached screen process.',
    key: 'r',
  },
  {
    flags: '-R [session]',
    description: 'Reattach if possible, otherwise start a new session.',
    key: 'R',
  },
  {
    flags: '-RR [session]',
    description: 'Reattach if possible, otherwise start a new session.',
    key: 'RR',
  },
  {
    flags: '-s <shell>',
    description: 'Shell to execute rather than $SHELL.',
    key: 's',
  },
  {
    flags: '-S <sockname>',
    description:
      'Name this session <pid>.sockname instead of <pid>.<tty>.<host>.',
    key: 'S',
  },
  { flags: '-t <title>', description: "Set title. (window's name).", key: 't' },
  {
    flags: '-T <term>',
    description: 'Use term as $TERM for windows, rather than "screen".',
    key: 'T',
  },
  { flags: '-U', description: 'Tell screen to use UTF-8 encoding.', key: 'U' },
  { flags: '-v, --version', description: 'Print version.', key: 'version' },
  {
    flags: '-wipe [session]',
    description: 'Do nothing, just clean up SockDir.',
    key: 'wipe',
  },
  {
    flags: '-x [session]',
    description: 'Attach to a not detached screen. (Multi display mode).',
    key: 'x',
  },
  {
    flags: '-X',
    description: 'Execute <cmd> as a screen command in the specified session.',
    key: 'X',
  },
  {
    flags: '--timeout <seconds>',
    description: 'Exit after N seconds (for testing).',
    key: 'timeout',
  },
  {
    flags: '--background <session>',
    description: 'Run session in background (internal use).',
    key: 'background',
  },
  {
    flags: '--server',
    description: 'Just run the server, do not connect to a session.',
    key: 'server',
  },
  {
    flags: '--foreground',
    description: 'Run the server in the foreground.',
    key: 'foreground',
  },
  {
    flags: '--kill-server',
    description: 'Kills the running server and all sessions.',
    key: 'killServer',
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
    .name('ai-screen')
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
g_program.action(async (command: string[], options: CliOptions) => {
  if (options.version) {
    _version();
    return;
  }
  if (options.q) {
    setQuiet(true);
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
  if (options.DmS) {
    await createSession(options.DmS);
  } else if (options.server) {
    await startServer(options.foreground ?? false);
    return;
  } else if (options.killServer) {
    await killServer();
    return;
  } else if (options.list) {
    await listSessions();
    return;
    /*  } else if (options.background) {
    runSessionInBackground(options.background, command);
    return;
  } else if (options.r !== undefined) {
    reattachToSession(options.r);
    return;
  } else if (Object.keys(options).length === 0) {
    const session_name = options.S ?? 'default';
    startNewSession(session_name, command, options.timeout);
*/
  } else {
    const key = Object.keys(options)[0];
    _unsupported(key);
  }
});
g_program.parse();

function _version(): void {
  log('ai-screen version 0.0.1 (ai-screen)');
}
function _unsupported(flag_name: string): void {
  errorLog(`Error: Flag '${flag_name}' is not yet supported in ai-screen`);
  process.exit(1);
}
