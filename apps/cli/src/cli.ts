#!/usr/bin/env node

import { Command } from "commander";
import { Session } from "./session";

const g_program = new Command();

g_program.version("0.0.1").description("A screen emulator in TypeScript");

g_program.argument("[command...]").action((command: string[]) => {
  const session = new Session("default");
  const window = session.createWindow(command);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdout.on("resize", () => {
    window.resize(process.stdout.columns, process.stdout.rows);
  });

  window.process.onData((data: string) => {
    process.stdout.write(data);
  });

  process.stdin.on("data", (data: string) => {
    window.process.write(data);
  });

  process.stdin.on("close", () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.exit(0);
  });

  window.process.onExit(() => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.exit();
  });
});

g_program.parse(process.argv);
