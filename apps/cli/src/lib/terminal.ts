import { EventEmitter } from 'node:events';
import { spawn } from 'node-pty';
import Headless from '@xterm/headless';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { displayStateToAnsi } from '@ai-screen/shared';

import { log, errorLog } from '../tools/log';
import { lineToString } from './xterm_serialize';

import type {
  AnsiDisplayState,
  BufferState,
  CursorState,
  TerminalJson,
} from '@ai-screen/shared';
import type { IPty } from 'node-pty';
import type { IBuffer, ITerminalAddon } from '@xterm/headless';
import type { DeepPartial } from '../tools/util';

const VERY_LARGE = 10 * 1000 * 1000;
const TARGET_TRIM = 100;
const MAX_ROWS = 4095;
const MAX_COLUMNS = 4095;

let g_terminalNumber = 1;

export interface TerminalScreenState {
  normal: BufferState;
  alternate?: BufferState;
  startY: number;
  scrollbackLines: number;
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
} & DeepPartial<AnsiDisplayState>;

export class Terminal extends EventEmitter {
  public readonly id: number;
  public readonly pty: IPty;
  private readonly _xterm: Headless.Terminal;
  private readonly _lineFeedDispose: ReturnType<
    Headless.Terminal['onLineFeed']
  > | null = null;
  private readonly _dataDispose: ReturnType<IPty['onData']> | null = null;
  private readonly _exitDispose: ReturnType<IPty['onExit']> | null = null;
  private readonly _startY: number;
  private readonly _trimmedRows: string[] = [];

  public constructor(params: TerminalParams) {
    super();
    this.id = g_terminalNumber++;
    this._xterm = new Headless.Terminal({
      cols: params.columns,
      rows: params.rows,
      allowProposedApi: true,
      scrollback: VERY_LARGE,
    });
    this._xterm.loadAddon(new Unicode11Addon() as unknown as ITerminalAddon);
    this._xterm.unicode.activeVersion = '11';
    this._lineFeedDispose = this._xterm.onLineFeed(this._onLineFeed);

    if (params.cursor || params.altScreen) {
      const opts = { altScreen: params.altScreen, cursor: params.cursor };
      this._xterm.write(displayStateToAnsi(opts));
    }
    this._startY = params.cursor?.y ?? 1;

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
    const { rows, columns } = params;
    if (rows < 1 || columns < 1 || rows > MAX_ROWS || columns > MAX_COLUMNS) {
      errorLog('terminal.resize: invalid resize:', params);
      throw new Error('invalid_resize');
    }
    this.pty.resize(columns, rows);
    this._xterm.resize(columns, rows);
  }
  public getScreenState(): TerminalScreenState {
    const normal = this._bufferState(this._xterm.buffer.normal);
    const alternate =
      this._xterm.buffer.active.type === 'alternate'
        ? this._bufferState(this._xterm.buffer.active)
        : undefined;
    const count = this.getScrollback().length;
    return { normal, alternate, startY: this._startY, scrollbackLines: count };
  }
  public getAnsiDisplayState(): AnsiDisplayState {
    return {
      cursor: this._getCursorState(this._xterm.buffer.normal),
      altScreen: this._xterm.buffer.active.type === 'alternate',
    };
  }
  public getScrollback() {
    this._trim();
    return this._trimmedRows;
  }
  public destroy() {
    this._dataDispose?.dispose();
    this._exitDispose?.dispose();
    this._lineFeedDispose?.dispose();
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
    return { terminalId: this.id, ...this.getScreenState() };
  }
  private _bufferState(buffer: IBuffer): BufferState {
    const ret: BufferState = {
      buffer: [],
      cursor: this._getCursorState(buffer),
    };
    let i = Math.max(0, buffer.length - this._xterm.rows);
    for (; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        ret.buffer.push(lineToString(line));
      } else {
        errorLog('terminal._bufferState: bad line:', line);
        ret.buffer.push('');
      }
    }
    return ret;
  }
  private _getCursorState(buffer: IBuffer): CursorState {
    return {
      x: buffer.cursorX + 1,
      y: buffer.cursorY + 1,
      blinking: this._xterm.options.cursorBlink ?? false,
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
  private readonly _onLineFeed = () => {
    const buffer = this._xterm.buffer.normal;
    const scrollback = buffer.length - this._xterm.rows;
    if (scrollback > TARGET_TRIM) {
      this._trim();
    }
  };
  private _trim() {
    const buffer = this._xterm.buffer.normal;
    const scrollback = buffer.length - this._xterm.rows;
    log('_trim: before trim:', buffer.length);
    for (let i = 0; i < scrollback; i++) {
      const line = buffer.getLine(i);
      if (line) {
        this._trimmedRows.push(lineToString(line));
      } else {
        errorLog('terminal._trim: bad line:', line);
        this._trimmedRows.push('');
      }
    }
    this._xterm.options.scrollback = 0;
    this._xterm.options.scrollback = VERY_LARGE;
    log('_trim: after trim:', buffer.length);
  }
}
export default { Terminal };
