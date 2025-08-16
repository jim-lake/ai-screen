import { EventEmitter } from 'node:events';
import { spawn } from 'node-pty';
import Headless from '@xterm/headless';

import type { IPty } from 'node-pty';

let g_terminalNumber = 1;

export interface TerminalScreenState {
  content: string;
  cursorX: number;
  cursorY: number;
}

export interface TerminalEvents {
  data: (data: string) => void;
  error: (err: Error) => void;
  exit: (event: { code: number; signal: number | undefined }) => void;
}
export interface TerminalParams {
  shell: string;
  command?: string[];
  cwd: string;
  rows: number;
  columns: number;
  env: Record<string, string>;
}
export class Terminal extends EventEmitter {
  public id: number;
  public pty: IPty;
  private readonly _xterm: Headless.Terminal;
  private readonly _dataDispose: ReturnType<IPty['onData']> | null = null;
  private readonly _exitDispose: ReturnType<IPty['onExit']> | null = null;

  public constructor(params: TerminalParams) {
    super();
    this.id = g_terminalNumber++;
    this._xterm = new Headless.Terminal({
      cols: params.columns,
      rows: params.rows,
      allowProposedApi: true,
    });

    const { shell, command } = params;
    const cmd = command?.[0] ?? shell;
    const args = command?.slice(1) ?? [];
    this.pty = spawn(cmd, args, {
      name: 'xterm-color',
      cols: params.columns,
      rows: params.rows,
      cwd: params.cwd,
      env: params.env,
    });
    this._dataDispose = this.pty.onData(this._onData);
    this._exitDispose = this.pty.onExit(this._onExit);
  }
  public write(data: string) {
    this.pty.write(data);
  }
  public resize(params: { rows: number; columns: number }) {
    this.pty.resize(params.columns, params.rows);
    this._xterm.resize(params.columns, params.rows);
  }
  public getScreenState(): TerminalScreenState {
    const buffer = this._xterm.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString());
      } else {
        lines.push('');
      }
    }
    return {
      content: lines.join('\n'),
      cursorX: buffer.cursorX,
      cursorY: buffer.cursorY,
    };
  }

  public destroy() {
    this._dataDispose?.dispose();
    this._exitDispose?.dispose();
    this._xterm.dispose();
  }
  public on<E extends keyof TerminalEvents>(
    event: E,
    listener: TerminalEvents[E]
  ): this {
    return super.on(event, listener);
  }
  public emit<E extends keyof TerminalEvents>(
    event: E,
    ...args: Parameters<TerminalEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
  private readonly _onData = (data: string) => {
    this._xterm.write(data);
    this.emit('data', data);
  };
  private readonly _onExit = (event: { exitCode: number; signal?: number }) => {
    this.emit('exit', { code: event.exitCode, signal: event.signal });
  };
}
export default { Terminal };
