#!/usr/bin/env node

import { Command } from "commander";
import {
  listActiveSessions,
  runSessionInBackground,
  reattachToSession,
  startNewSession,
} from "./index";

const program = new Command();

program
  .description("A modern screen emulator for the ai age.")
  .usage("[-opts] [cmd [args]]")
  .addHelpText(
    "before",
    "Use: ai-screen [-opts] [cmd [args]]\n or: ai-screen -r [host.tty]\n",
  );

program
  // Supported flags (basic implementation)
  .option("-ls, --list", "list running sessions")
  .option("-r [session]", "reattach to a detached screen process")
  .option(
    "-S <sockname>",
    "name this session <pid>.sockname instead of <pid>.<tty>.<host>",
  )
  .option("--timeout <seconds>", "exit after N seconds (for testing)")
  .option("--background <session>", "run session in background (internal use)")

  // GNU screen flags - mostly unsupported for now
  .option("-a", "force all capabilities into each window's termcap")
  .option("-A", "adapt all windows to the new display width & height")
  .option("-c <file>", "read configuration file instead of '.screenrc'")
  .option(
    "-d [session]",
    "detach the elsewhere running screen (and reattach here)",
  )
  .option("-dmS <n>", "start as daemon: Screen session in detached mode")
  .option("-D [session]", "detach and logout remote (and reattach here)")
  .option("-e <xy>", "change command characters")
  .option("-f", "flow control on, -fn = off, -fa = auto")
  .option("-fn", "flow control off")
  .option("-fa", "flow control auto")
  .option("-h <lines>", "set the size of the scrollback history buffer")
  .option("-i", "interrupt output sooner when flow control is on")
  .option("-L", "turn on output logging")
  .option("-m", "ignore $STY variable, do create a new screen session")
  .option("-O", "choose optimal output rather than exact vt100 emulation")
  .option("-p <window>", "preselect the named window if it exists")
  .option(
    "-q",
    "quiet startup. Exits with non-zero return code if unsuccessful",
  )
  .option("-R [session]", "reattach if possible, otherwise start a new session")
  .option(
    "-RR [session]",
    "reattach if possible, otherwise start a new session",
  )
  .option("-s <shell>", "shell to execute rather than $SHELL")
  .option("-t <title>", "set title (window's name)")
  .option("-T <term>", 'use term as $TERM for windows, rather than "screen"')
  .option("-U", "tell screen to use UTF-8 encoding")
  .option("-v, --version", "print version")
  .option("-wipe [session]", "do nothing, just clean up SockDir")
  .option(
    "-x [session]",
    "attach to a not detached screen (multi display mode)",
  )
  .option("-X", "execute <cmd> as a screen command in the specified session")
  .argument("[command...]")
  .action((command: string[], options) => {
    // Handle custom -v flag (GNU screen compatibility)
    if (options.v || options.version) {
      _version();
      return;
    }

    if (options.a) {
      _unsupported("-a");
    }
    if (options.A) {
      _unsupported("-A");
    }
    if (options.c) {
      _unsupported("-c");
    }
    if (options.d !== undefined) {
      _unsupported("-d");
    }
    if (options.dmS) {
      _unsupported("-dmS");
    }
    if (options.D !== undefined) {
      _unsupported("-D");
    }
    if (options.e) {
      _unsupported("-e");
    }
    if (options.f) {
      _unsupported("-f");
    }
    if (options.fn) {
      _unsupported("-fn");
    }
    if (options.fa) {
      _unsupported("-fa");
    }
    if (options.h) {
      _unsupported("-h");
    }
    if (options.i) {
      _unsupported("-i");
    }
    if (options.L) {
      _unsupported("-L");
    }
    if (options.m) {
      _unsupported("-m");
    }
    if (options.O) {
      _unsupported("-O");
    }
    if (options.p) {
      _unsupported("-p");
    }
    if (options.q) {
      _unsupported("-q");
    }
    if (options.R !== undefined) {
      _unsupported("-R");
    }
    if (options.RR !== undefined) {
      _unsupported("-RR");
    }
    if (options.s) {
      _unsupported("-s");
    }
    if (options.t) {
      _unsupported("-t");
    }
    if (options.T) {
      _unsupported("-T");
    }
    if (options.U) {
      _unsupported("-U");
    }
    if (options.wipe !== undefined) {
      _unsupported("--wipe");
    }
    if (options.x !== undefined) {
      _unsupported("-x");
    }
    if (options.X) {
      _unsupported("-X");
    }

    // Handle supported functionality
    if (options.ls || options.list) {
      listActiveSessions();
      return;
    } else if (options.background) {
      runSessionInBackground(options.background, command);
      return;
    } else if (options.r !== undefined) {
      reattachToSession(options.r);
      return;
    }

    // Default: create new session
    const sessionName = options.S || "default";
    startNewSession(sessionName, command, options.timeout);
  });

program.parse(process.argv);

function _version(): void {
  console.log("ai-screen version 0.0.1");
}
function _unsupported(flagName: string): void {
  console.error(`Error: Flag '${flagName}' is not yet supported in ai-screen`);
  process.exit(1);
}
