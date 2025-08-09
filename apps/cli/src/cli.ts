#!/usr/bin/env node

import { Command } from "commander";
import { Session } from "./session";
import { spawn } from "child_process";

const g_program = new Command();

g_program
  .description("A modern screen emulator for the ai age.")
  .usage("[-opts] [cmd [args]]")
  .addHelpText(
    "before",
    "Use: ai-screen [-opts] [cmd [args]]\n or: ai-screen -r [host.tty]\n",
  );

// Function to handle unsupported flags
function unsupported(flagName: string): void {
  console.error(`Error: Flag '${flagName}' is not yet supported in ai-screen`);
  process.exit(1);
}

g_program
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
  .option("-dmS <name>", "start as daemon: Screen session in detached mode")
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
      console.log("ai-screen version 0.0.1");
      return;
    }

    // Handle unsupported flags
    if (options.a) {
      unsupported("-a");
    }
    if (options.A) {
      unsupported("-A");
    }
    if (options.c) {
      unsupported("-c");
    }
    if (options.d !== undefined) {
      unsupported("-d");
    }
    if (options.dmS) {
      unsupported("-dmS");
    }
    if (options.D !== undefined) {
      unsupported("-D");
    }
    if (options.e) {
      unsupported("-e");
    }
    if (options.f) {
      unsupported("-f");
    }
    if (options.fn) {
      unsupported("-fn");
    }
    if (options.fa) {
      unsupported("-fa");
    }
    if (options.h) {
      unsupported("-h");
    }
    if (options.i) {
      unsupported("-i");
    }
    if (options.L) {
      unsupported("-L");
    }
    if (options.m) {
      unsupported("-m");
    }
    if (options.O) {
      unsupported("-O");
    }
    if (options.p) {
      unsupported("-p");
    }
    if (options.q) {
      unsupported("-q");
    }
    if (options.R !== undefined) {
      unsupported("-R");
    }
    if (options.RR !== undefined) {
      unsupported("-RR");
    }
    if (options.s) {
      unsupported("-s");
    }
    if (options.t) {
      unsupported("-t");
    }
    if (options.T) {
      unsupported("-T");
    }
    if (options.U) {
      unsupported("-U");
    }
    if (options.wipe !== undefined) {
      unsupported("--wipe");
    }
    if (options.x !== undefined) {
      unsupported("-x");
    }
    if (options.X) {
      unsupported("-X");
    }

    // Handle supported functionality
    if (options.ls || options.list) {
      const sessions = Session.listSessions();
      if (sessions.length === 0) {
        console.log("No sessions found.");
      } else {
        console.log("Active sessions:");
        sessions.forEach((session) => {
          const date = new Date(session.created).toLocaleString();
          console.log(`  ${session.name}\t(${session.pid})\t${date}`);
        });
      }
      return;
    }

    if (options.background) {
      // Background mode - keep session alive without terminal I/O
      const sessionName = options.background;
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
      process.on("SIGTERM", () => {
        Session.cleanupSession(sessionName);
        process.exit(0);
      });

      process.on("SIGINT", () => {
        Session.cleanupSession(sessionName);
        process.exit(0);
      });

      return;
    }

    if (options.r !== undefined) {
      const sessionName = options.r || "default";
      console.log(
        `Reattaching to session '${sessionName}' is not yet implemented.`,
      );
      return;
    }

    const sessionName = options.S || "default";
    const session = new Session(sessionName);
    const window = session.createWindow(command);
    let isAttached = true;

    // Set up timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout) {
      const timeoutSeconds = parseInt(options.timeout, 10);
      if (!isNaN(timeoutSeconds) && timeoutSeconds > 0) {
        timeoutId = setTimeout(() => {
          console.log(`\n[timeout after ${timeoutSeconds} seconds]`);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          Session.cleanupSession(sessionName);
          process.exit(0);
        }, timeoutSeconds * 1000);
      }
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Handle terminal resize
    process.stdout.on("resize", () => {
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
      process.stdin.removeAllListeners("data");
      process.stdin.removeAllListeners("close");

      // Spawn a detached background process to keep the session alive
      const child = spawn(
        process.execPath,
        [__filename, "--background", sessionName],
        {
          detached: true,
          stdio: "ignore",
        },
      );
      child.unref();

      console.log(`[detached from ${sessionName}]`);
      process.exit(0);
    });

    // Handle input from stdin
    process.stdin.on("data", (data: Buffer) => {
      if (isAttached) {
        window.handleInput(data);
      }
    });

    // Handle stdin close (Ctrl+C, etc.)
    process.stdin.on("close", () => {
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
    process.on("SIGTERM", () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      Session.cleanupSession(sessionName);
      process.exit(0);
    });

    process.on("SIGINT", () => {
      if (isAttached) {
        // Pass Ctrl+C to the window process
        window.process.write("\x03");
      }
    });
  });

g_program.parse(process.argv);
