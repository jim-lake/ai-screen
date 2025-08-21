import { EventEmitter } from 'node:events';
import { spawn } from 'node-pty';
import Headless from '@xterm/headless';

import { displayStateToAnsi } from '../tools/ansi';
import { errorLog } from '../tools/log';

import type { TerminalJson } from '@ai-screen/shared';
import type { IPty } from 'node-pty';
import type { IBuffer } from '@xterm/headless';
import type { AnsiDisplayState, CursorState } from '../tools/ansi';

let g_terminalNumber = 1;

export interface BufferState {
  cursor: CursorState;
  buffer: string[];
}
export interface TerminalScreenState {
  normal: BufferState;
  alternate?: BufferState;
  startY: number;
}
export interface TerminalExitEvent extends AnsiDisplayState {
  code: number;
  signal: number | undefined;
}
export interface TerminalEvents {
  data: (data: string) => void;
  error: (err: Error) => void;
  exit: (event: TerminalExitEvent) => void;
}
export type TerminalParams = {
  shell: string;
  command?: string[];
  cwd: string;
  rows: number;
  columns: number;
  env: Record<string, string>;
} & AnsiDisplayState;

export class Terminal extends EventEmitter {
  public id: number;
  public pty: IPty;
  private readonly _xterm: Headless.Terminal;
  private readonly _dataDispose: ReturnType<IPty['onData']> | null = null;
  private readonly _exitDispose: ReturnType<IPty['onExit']> | null = null;
  private readonly _startY: number;

  public constructor(params: TerminalParams) {
    super();
    this.id = g_terminalNumber++;
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

    this._xterm = new Headless.Terminal({
      cols: params.columns,
      rows: params.rows,
      allowProposedApi: true,
    });
    if (params.cursor || params.altScreen) {
      this._xterm.write(displayStateToAnsi(params));
    }
    this._startY = params.cursor?.y ?? 1;
  }
  public write(data: string) {
    this.pty.write(data);
  }
  public resize(params: { rows: number; columns: number }) {
    this.pty.resize(params.columns, params.rows);
    this._xterm.resize(params.columns, params.rows);
  }
  public getScreenState(): TerminalScreenState {
    const normal = this._bufferState(this._xterm.buffer.normal);
    const alternate =
      this._xterm.buffer.active.type === 'alternate'
        ? this._bufferState(this._xterm.buffer.active)
        : undefined;
    return { normal, alternate, startY: this._startY };
  }
  public getAnsiDisplayState() {
    return {
      cursor: this._getCursorState(this._xterm.buffer.normal),
      altScreen: this._xterm.buffer.active.type === 'alternate',
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
  public toJSON(): TerminalJson {
    return { id: this.id };
  }
  private _bufferState(buffer: IBuffer): BufferState {
    const ret: BufferState = {
      buffer: [],
      cursor: this._getCursorState(buffer),
    };
    let i = Math.max(0, buffer.length - this._xterm.cols);
    for (; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        ret.buffer.push(line.translateToString());
      } else {
        errorLog('terminal._bufferState: bad line:', line);
        ret.buffer.push('');
      }
    }
    return ret;
  }
  private _getCursorState(buffer: IBuffer) {
    return {
      x: buffer.cursorX + 1,
      y: buffer.cursorY + 1,
      blinking: this._xterm.options.cursorBlink,
      visible: !this._xterm._core.coreService.isCursorHidden,
    };
  }
  private readonly _onData = (data: string) => {
    this._xterm.write(data);
    this.emit('data', data);
  };
  private readonly _onExit = (event: { exitCode: number; signal?: number }) => {
    const state = this.getAnsiDisplayState();
    this.emit('exit', { code: event.exitCode, signal: event.signal, ...state });
  };
}
export default { Terminal };
