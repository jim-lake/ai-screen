import { spawn } from "node-pty";

export class Window {
  public id: number;
  public process: any;

  constructor(id: number, command?: string[]) {
    this.id = id;
    const shell = process.env.SHELL || "bash";
    const cmd = command && command.length > 0 ? command[0] : shell;
    const args = command && command.length > 1 ? command.slice(1) : [];
    this.process = spawn(cmd, args, {
      name: "xterm-color",
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      cwd: process.env.HOME,
      env: process.env,
    });
  }

  public resize(cols: number, rows: number) {
    this.process.resize(cols, rows);
  }
}
