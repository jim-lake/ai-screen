#!/usr/bin/env node

import { Command } from "commander";
import { Session } from "./session";

const program = new Command();

program.version("0.0.1").description("A screen emulator in TypeScript");

program.argument("[command...]").action((command: string[]) => {
  const session = new Session("default");
  const window = session.createWindow(command);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdout.on("resize", () => {
    window.resize(process.stdout.columns, process.stdout.rows);
  });

  window.process.onData((data: any) => {
    process.stdout.write(data);
  });

  process.stdin.on("data", (data) => {
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

program.parse(process.argv);
