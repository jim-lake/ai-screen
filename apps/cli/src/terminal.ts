import { spawn, type IPty } from 'node-pty';

export class Terminal {
  public id: number;
  public process: IPty;
  private attentionMode = false;
  private onDetachCallback?: () => void;

  public constructor(id: number, command?: string[]) {
    this.id = id;
    const shell = process.env.SHELL ?? 'bash';
    const cmd = command && command.length > 0 ? command[0] : shell;
    const args = command && command.length > 1 ? command.slice(1) : [];
    this.process = spawn(cmd, args, {
      name: 'xterm-color',
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      cwd: process.env.HOME,
      env: process.env as Record<string, string>,
    });
  }

  public resize(columns: number, rows: number) {
    this.process.resize(columns, rows);
  }

  public onDetach(callback: () => void) {
    this.onDetachCallback = callback;
  }

  public handleInput(data: Buffer): boolean {
    const input = data.toString();

    // Process each character individually
    for (const char of input) {
      // Check for Ctrl+A (attention character)
      if (char === '\x01') {
        this.attentionMode = true;
        continue; // Don't pass to process
      }

      // If we're in attention mode, handle the next character
      if (this.attentionMode) {
        this.attentionMode = false;

        switch (char) {
          case 'd':
          case 'D':
            // Detach command
            if (this.onDetachCallback) {
              this.onDetachCallback();
            }
            return true;
          case '\x01':
            // Ctrl+A Ctrl+A sends literal Ctrl+A to the process
            this.process.write('\x01');
            break;
          default:
            // Unknown command, ignore
            break;
        }
        continue;
      }

      // Normal character, pass to process
      this.process.write(char);
    }

    return true;
  }
}
