import { EventEmitter } from 'events';
import type {
  IRenderer,
  IRenderDimensions,
  IRequestRedrawEvent,
} from '@xterm/xterm/src/browser/renderer/shared/Types';
import type { IDisposable, IEvent, Terminal } from '@xterm/xterm';

export class XTermCustomRenderer implements IRenderer {
  private readonly _terminal: Terminal;
  private _container?: HTMLElement;
  private _rowContainer?: HTMLElement;
  private _cursorElement?: HTMLElement;
  private readonly _eventEmitter: EventEmitter;
  private _dimensions: IRenderDimensions;
  private _disposed = false;
  private _devicePixelRatio = 1;
  private _cursorX = 0;
  private _cursorY = 0;

  constructor(terminal: Terminal) {
    this._terminal = terminal;
    this._eventEmitter = new EventEmitter();
    this._devicePixelRatio = window.devicePixelRatio || 1;
    this._addStyles();
    this._dimensions = this._calculateDimensions();
  }

  private _ensureContainer(): boolean {
    if (this._container && this._rowContainer && this._cursorElement) {
      return true;
    }

    const terminalElement = (this._terminal as any).element;
    if (!terminalElement) {
      return false;
    }

    // Create container if it doesn't exist
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'xterm-custom-overlay';
      this._container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
      `;
      terminalElement.appendChild(this._container);
    }

    // Create row container if it doesn't exist
    if (!this._rowContainer) {
      this._rowContainer = document.createElement('div');
      this._rowContainer.className = 'xterm-custom-rows';
      this._rowContainer.style.cssText = `
        position: relative;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre;
        overflow: hidden;
      `;
      this._container.appendChild(this._rowContainer);
    }

    // Create cursor element if it doesn't exist
    if (!this._cursorElement) {
      this._cursorElement = document.createElement('div');
      this._cursorElement.className = 'xterm-custom-cursor';
      this._cursorElement.style.cssText = `
        position: absolute;
        background-color: #ffffff;
        color: #000000;
        z-index: 1;
        pointer-events: none;
      `;
      this._container.appendChild(this._cursorElement);
    }

    this._setupStyles();
    return true;
  }

  private _addStyles(): void {
    const styleId = 'xterm-custom-renderer-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .xterm-custom-rows {
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
      }
      
      .xterm-custom-row {
        white-space: pre;
        overflow: hidden;
      }
      
      .xterm-custom-cursor {
        animation: xterm-custom-cursor-blink 1s infinite;
      }
      
      @keyframes xterm-custom-cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      
      .xterm-custom-selection {
        background-color: rgba(255, 255, 255, 0.3) !important;
      }
      
      .xterm-custom-column-selection {
        background-color: rgba(255, 255, 0, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
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
    this._rowContainer?.remove();
    this._cursorElement?.remove();
    this._container?.remove();
    this._rowContainer = undefined;
    this._cursorElement = undefined;
    this._container = undefined;
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
    if (!this._ensureContainer()) return;
    this._dimensions = this._calculateDimensions();
    this._ensureRowElements(rows);
    this._requestRedraw(0, rows - 1);
  }

  public handleCharSizeChanged(): void {
    if (!this._ensureContainer()) return;
    this._dimensions = this._calculateDimensions();
    this._setupStyles();
    this._requestRedraw(0, this._terminal.rows - 1);
  }

  public handleBlur(): void {
    if (!this._ensureContainer()) return;
    this._cursorElement!.style.opacity = '0.5';
  }

  public handleFocus(): void {
    if (!this._ensureContainer()) return;
    this._cursorElement!.style.opacity = '1';
  }

  public handleSelectionChanged(
    _start: [number, number] | undefined,
    _end: [number, number] | undefined,
    _columnSelectMode: boolean
  ): void {
    // Selection handling not implemented yet
  }

  public handleCursorMove(): void {
    if (!this._ensureContainer()) return;
    this._updateCursor();
  }

  public clear(): void {
    if (!this._ensureContainer()) return;
    this._rowContainer!.innerHTML = '';
    this._cursorElement!.style.display = 'none';
  }

  public renderRows(start: number, end: number): void {
    if (this._disposed || !this._ensureContainer()) {
      return;
    }

    const buffer = this._terminal.buffer?.active;
    if (!buffer) {
      this._ensureRowElements(this._terminal.rows);
      for (let y = start; y <= end; y++) {
        this._renderEmptyRow(y);
      }
      return;
    }

    this._ensureRowElements(this._terminal.rows);

    try {
      for (let y = start; y <= end; y++) {
        this._renderRow(y, buffer);
      }
    } catch (error) {
      console.warn('Custom renderer failed:', error);
      for (let y = start; y <= end; y++) {
        this._renderEmptyRow(y);
      }
    }

    this._updateCursor();
  }

  private _renderEmptyRow(y: number): void {
    if (!this._rowContainer) return;
    const rowElement = this._rowContainer.children[y] as HTMLElement;
    if (rowElement) {
      rowElement.innerHTML = '&nbsp;'.repeat(this._terminal.cols);
    }
  }

  private _renderRow(y: number, buffer: any): void {
    if (!this._rowContainer) return;
    const rowElement = this._rowContainer.children[y] as HTMLElement;
    if (!rowElement) return;

    const line = buffer.getLine(y);
    if (!line) {
      rowElement.innerHTML = '';
      return;
    }

    rowElement.innerHTML = line.translateToString(true);
  }

  private _calculateDimensions(): IRenderDimensions {
    const terminalElement = (this._terminal as any).element;
    const containerRect = terminalElement?.getBoundingClientRect() || { width: 800, height: 600 };
    const computedStyle = terminalElement ? window.getComputedStyle(terminalElement) : { fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.2' };
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

  private _setupStyles(): void {
    const cellHeight = this._dimensions.css.cell.height;
    if (this._rowContainer) {
      this._rowContainer.style.lineHeight = `${cellHeight}px`;
    }
    if (this._cursorElement) {
      this._cursorElement.style.width = `${this._dimensions.css.cell.width}px`;
      this._cursorElement.style.height = `${cellHeight}px`;
    }
  }

  private _ensureRowElements(rows: number): void {
    if (!this._rowContainer) return;
    
    const currentRows = this._rowContainer.children.length;

    if (currentRows < rows) {
      for (let i = currentRows; i < rows; i++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'xterm-custom-row';
        rowElement.style.cssText = `
          position: relative;
          height: ${this._dimensions.css.cell.height}px;
          white-space: pre;
        `;
        this._rowContainer.appendChild(rowElement);
      }
    } else if (currentRows > rows) {
      for (let i = currentRows - 1; i >= rows; i--) {
        const child = this._rowContainer.children[i];
        if (child) {
          child.remove();
        }
      }
    }
  }

  private _updateCursor(): void {
    if (!this._cursorElement) return;
    
    const buffer = this._terminal.buffer?.active;
    if (!buffer) {
      this._cursorX = 0;
      this._cursorY = 0;
    } else {
      this._cursorX = buffer.cursorX;
      this._cursorY = buffer.cursorY;
    }

    const x = this._cursorX * this._dimensions.css.cell.width;
    const y = this._cursorY * this._dimensions.css.cell.height;

    this._cursorElement.style.left = `${x}px`;
    this._cursorElement.style.top = `${y}px`;
    this._cursorElement.style.display = 'block';
  }

  private _requestRedraw(start: number, end: number): void {
    this._eventEmitter.emit('requestRedraw', { start, end });
  }
}
