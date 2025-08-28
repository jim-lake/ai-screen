import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import type {
  IRenderer,
  IRenderDimensions,
  IRequestRedrawEvent,
} from '@xterm/xterm/src/browser/renderer/shared/Types';
import type { IEvent } from '@xterm/xterm';
import { EventEmitter } from 'events';
import { rendererCallbacks } from './xterm_renderer_callbacks';

interface TerminalCore {
  _core: {
    onWillOpen: (callback: () => void) => IDisposable;
    _renderService: {
      setRenderer: (renderer: unknown) => void;
      handleResize: (cols: number, rows: number) => void;
    };
    _createRenderer: () => unknown;
  };
}

class ReactRenderer implements IRenderer {
  private readonly _terminal: Terminal;
  private readonly _sessionName: string;
  private readonly _eventEmitter: EventEmitter;
  private _dimensions: IRenderDimensions;
  private _disposed = false;
  private _devicePixelRatio = 1;

  constructor(terminal: Terminal, sessionName: string) {
    this._terminal = terminal;
    this._sessionName = sessionName;
    this._eventEmitter = new EventEmitter();
    this._devicePixelRatio = window.devicePixelRatio || 1;
    this._dimensions = this._calculateDimensions();
  }

  public get dimensions(): IRenderDimensions {
    return this._dimensions;
  }

  public get onRequestRedraw(): IEvent<IRequestRedrawEvent> {
    return (listener: (arg: IRequestRedrawEvent) => void): IDisposable => {
      this._eventEmitter.on('requestRedraw', listener);
      return {
        dispose: () => {
          this._eventEmitter.removeListener('requestRedraw', listener);
        },
      };
    };
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._eventEmitter.removeAllListeners();
  }

  public handleDevicePixelRatioChange(): void {
    const newRatio = window.devicePixelRatio || 1;
    if (newRatio !== this._devicePixelRatio) {
      this._devicePixelRatio = newRatio;
      this._dimensions = this._calculateDimensions();
      this._requestRedraw(0, this._terminal.rows - 1);
    }
  }

  public handleResize(_cols: number, rows: number): void {
    this._dimensions = this._calculateDimensions();
    this._requestRedraw(0, rows - 1);
  }

  public handleCharSizeChanged(): void {
    this._dimensions = this._calculateDimensions();
    this._requestRedraw(0, this._terminal.rows - 1);
  }

  public handleBlur(): void {
    const callbacks = rendererCallbacks.get(this._sessionName);
    callbacks?.setFocused(false);
  }

  public handleFocus(): void {
    const callbacks = rendererCallbacks.get(this._sessionName);
    callbacks?.setFocused(true);
  }

  public handleSelectionChanged(
    start: [number, number] | undefined,
    end: [number, number] | undefined,
    columnSelectMode: boolean
  ): void {
    const callbacks = rendererCallbacks.get(this._sessionName);
    callbacks?.setSelection({ start, end, columnMode: columnSelectMode });
  }

  public handleCursorMove(): void {
    this._updateCursor();
  }

  public clear(): void {
    const callbacks = rendererCallbacks.get(this._sessionName);
    callbacks?.setLines([]);
    callbacks?.setCursor({ x: 0, y: 0, visible: false });
  }

  public renderRows(start: number, end: number): void {
    if (this._disposed) {
      return;
    }

    const buffer = this._terminal.buffer.active;
    const lines: { content: string; y: number }[] = [];

    for (let y = start; y <= end; y++) {
      const line = (
        buffer as {
          getLine: (
            y: number
          ) => { translateToString: (trim: boolean) => string } | null;
        }
      ).getLine(y);

      if (line) {
        const content = line.translateToString(true);
        lines.push({ content, y });
      }
    }

    const callbacks = rendererCallbacks.get(this._sessionName);
    if (callbacks) {
      callbacks.setLines((prevLines) => {
        const lineMap = new Map(prevLines.map((l) => [l.y, l]));
        lines.forEach((newLine) => {
          lineMap.set(newLine.y, newLine);
        });
        return Array.from(lineMap.values()).sort((a, b) => a.y - b.y);
      });
    }

    this._updateCursor();
  }

  private _calculateDimensions(): IRenderDimensions {
    const terminalElement = (
      this._terminal as unknown as { element?: HTMLElement }
    ).element;
    const containerRect = terminalElement?.getBoundingClientRect() ?? {
      width: 800,
      height: 600,
    };
    const computedStyle = terminalElement
      ? window.getComputedStyle(terminalElement)
      : { fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.2' };
    const fontSize = parseFloat(computedStyle.fontSize) || 12;
    const fontFamily = computedStyle.fontFamily || 'monospace';
    const lineHeightValue = parseFloat(computedStyle.lineHeight);
    const lineHeight = isNaN(lineHeightValue)
      ? fontSize * 1.2
      : lineHeightValue;

    const testChar = document.createElement('span');
    testChar.textContent = 'W';
    testChar.style.cssText = `
      position: absolute;
      visibility: hidden;
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      white-space: pre;
    `;
    document.body.appendChild(testChar);
    const charRect = testChar.getBoundingClientRect();
    document.body.removeChild(testChar);

    const cellWidth = charRect.width;
    const cellHeight = lineHeight;

    return {
      css: {
        canvas: { width: containerRect.width, height: containerRect.height },
        cell: { width: cellWidth, height: cellHeight },
      },
      device: {
        canvas: {
          width: containerRect.width * this._devicePixelRatio,
          height: containerRect.height * this._devicePixelRatio,
        },
        cell: {
          width: cellWidth * this._devicePixelRatio,
          height: cellHeight * this._devicePixelRatio,
        },
        char: {
          width: cellWidth * this._devicePixelRatio,
          height: cellHeight * this._devicePixelRatio,
          top: 0,
          left: 0,
        },
      },
    };
  }

  private _updateCursor(): void {
    const buffer = this._terminal.buffer.active;
    const callbacks = rendererCallbacks.get(this._sessionName);
    callbacks?.setCursor({
      x: buffer.cursorX,
      y: buffer.cursorY,
      visible: true,
    });
  }

  private _requestRedraw(start: number, end: number): void {
    this._eventEmitter.emit('requestRedraw', { start, end });
  }
}

export class ReactRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: ReactRenderer;
  private _terminal?: Terminal;
  private _disposables: IDisposable[] = [];
  private readonly _sessionName: string;

  constructor(sessionName: string) {
    this._sessionName = sessionName;
  }

  public activate(terminal: Terminal): void {
    const terminalWithCore = terminal as Terminal & TerminalCore;
    const core = terminalWithCore._core;

    if (!terminal.element) {
      this.register(core.onWillOpen(() => this.activate(terminal)));
      return;
    }

    this._terminal = terminal;
    const renderService = core._renderService;

    this._renderer = this.register(
      new ReactRenderer(terminal, this._sessionName)
    );
    renderService.setRenderer(this._renderer);

    this.register({
      dispose: () => {
        const terminalCore = (this._terminal as Terminal & TerminalCore)._core;
        const service = terminalCore._renderService;
        service.setRenderer(terminalCore._createRenderer());
        service.handleResize(terminal.cols, terminal.rows);
      },
    });
  }

  private register<T extends IDisposable>(disposable: T): T {
    this._disposables.push(disposable);
    return disposable;
  }

  public dispose(): void {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
    this._renderer = undefined;
    this._terminal = undefined;
  }
}
