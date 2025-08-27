import { EventEmitter } from 'events';
import type {
  IRenderer,
  IRenderDimensions,
  IRequestRedrawEvent,
} from '@xterm/xterm/src/browser/renderer/shared/Types';
import type { IDisposable, IEvent } from '@xterm/xterm';

// Interface for xterm.js core terminal
export interface ITerminalCore {
  cols: number;
  rows: number;
  buffer?: {
    active?: {
      ydisp: number;
      ybase: number;
      y: number;
      x: number;
      lines: { get(index: number): IBufferLine | undefined; length: number };
    };
  };
  options: { cursorBlink?: boolean; theme?: unknown };
}

interface IBufferLine {
  length: number;
  isWrapped: boolean;
  getCell(x: number): ICharData | undefined;
  translateToString(
    trimRight?: boolean,
    startColumn?: number,
    endColumn?: number
  ): string;
}

interface ICharData {
  getChars(): string;
  getCode(): number;
  getWidth(): number;
  getBgColorMode(): number;
  getFgColorMode(): number;
  getBgColor(): number;
  getFgColor(): number;
  isBold(): number;
  isDim(): number;
  isItalic(): number;
  isUnderline(): number;
  isStrikethrough(): number;
  isInverse(): number;
  isInvisible(): number;
}

export class XTermCustomRenderer implements IRenderer {
  private readonly _terminal: ITerminalCore;
  private readonly _container: HTMLElement;
  private readonly _rowContainer: HTMLElement;
  private readonly _cursorElement: HTMLElement;
  private readonly _eventEmitter: EventEmitter;
  private _dimensions: IRenderDimensions;
  private _disposed = false;
  private _devicePixelRatio = 1;
  private _cursorX = 0;
  private _cursorY = 0;
  private _selectionStart: [number, number] | undefined;
  private _selectionEnd: [number, number] | undefined;
  private _columnSelectMode = false;

  constructor(terminal: ITerminalCore, container: HTMLElement) {
    this._terminal = terminal;
    this._container = container;
    this._eventEmitter = new EventEmitter();
    this._devicePixelRatio = window.devicePixelRatio || 1;

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

    this._cursorElement = document.createElement('div');
    this._cursorElement.className = 'xterm-custom-cursor';
    this._cursorElement.style.cssText = `
      position: absolute;
      background-color: #ffffff;
      color: #000000;
      z-index: 1;
      pointer-events: none;
    `;

    this._container.appendChild(this._rowContainer);
    this._container.appendChild(this._cursorElement);

    // Add CSS styles for the custom renderer
    this._addStyles();

    this._dimensions = this._calculateDimensions();
    this._setupStyles();
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
    this._rowContainer.remove();
    this._cursorElement.remove();
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
    this._ensureRowElements(rows);
    this._requestRedraw(0, rows - 1);
  }

  public handleCharSizeChanged(): void {
    this._dimensions = this._calculateDimensions();
    this._setupStyles();
    this._requestRedraw(0, this._terminal.rows - 1);
  }

  public handleBlur(): void {
    this._cursorElement.style.opacity = '0.5';
  }

  public handleFocus(): void {
    this._cursorElement.style.opacity = '1';
  }

  public handleSelectionChanged(
    start: [number, number] | undefined,
    end: [number, number] | undefined,
    columnSelectMode: boolean
  ): void {
    this._selectionStart = start;
    this._selectionEnd = end;
    this._columnSelectMode = columnSelectMode; // Keep for future column selection implementation
    this._updateSelection();
  }

  public handleCursorMove(): void {
    this._updateCursor();
  }

  public clear(): void {
    this._rowContainer.innerHTML = '';
    this._cursorElement.style.display = 'none';
  }

  public renderRows(start: number, end: number): void {
    if (this._disposed) {
      return;
    }

    const buffer = this._terminal.buffer?.active;
    if (!buffer) {
      // If buffer is not available, render empty rows
      this._ensureRowElements(this._terminal.rows);
      for (let y = start; y <= end; y++) {
        this._renderEmptyRow(y);
      }
      return;
    }

    this._ensureRowElements(this._terminal.rows);

    for (let y = start; y <= end; y++) {
      this._renderRow(y, buffer);
    }

    this._updateCursor();
    this._updateSelection();
  }

  private _renderEmptyRow(y: number): void {
    const rowElement = this._rowContainer.children[y] as HTMLElement;
    // rowElement is guaranteed to exist since we call _ensureRowElements before this
    rowElement.innerHTML = '&nbsp;'.repeat(this._terminal.cols);
  }

  private _renderRow(
    y: number,
    buffer: {
      ydisp: number;
      lines: { get(index: number): IBufferLine | undefined };
    }
  ): void {
    const rowElement = this._rowContainer.children[y] as HTMLElement;
    // rowElement is guaranteed to exist since we call _ensureRowElements before this

    const bufferY = buffer.ydisp + y;
    const line = buffer.lines.get(bufferY);

    if (!line) {
      rowElement.innerHTML = '';
      return;
    }

    let html = '';
    let currentBg = -1;
    let currentFg = -1;
    let currentStyles = '';
    let spanOpen = false;

    for (let x = 0; x < this._terminal.cols; x++) {
      const cell = line.getCell(x);
      if (!cell) {
        if (spanOpen) {
          html += '</span>';
          spanOpen = false;
        }
        html += ' ';
        continue;
      }

      const char = cell.getChars() || ' ';
      const bg = cell.getBgColor();
      const fg = cell.getFgColor();
      const bold = cell.isBold();
      const dim = cell.isDim();
      const italic = cell.isItalic();
      const underline = cell.isUnderline();
      const strikethrough = cell.isStrikethrough();
      const inverse = cell.isInverse();

      let styles = '';
      if (bold) {
        styles += 'font-weight: bold; ';
      }
      if (dim) {
        styles += 'opacity: 0.5; ';
      }
      if (italic) {
        styles += 'font-style: italic; ';
      }
      if (underline) {
        styles += 'text-decoration: underline; ';
      }
      if (strikethrough) {
        styles += 'text-decoration: line-through; ';
      }

      let bgColor = '';
      let fgColor = '';

      if (inverse) {
        bgColor = this._getColor(fg);
        fgColor = this._getColor(bg);
      } else {
        bgColor = this._getColor(bg);
        fgColor = this._getColor(fg);
      }

      if (bgColor) {
        styles += `background-color: ${bgColor}; `;
      }
      if (fgColor) {
        styles += `color: ${fgColor}; `;
      }

      if (styles !== currentStyles || bg !== currentBg || fg !== currentFg) {
        if (spanOpen) {
          html += '</span>';
        }
        if (styles) {
          html += `<span style="${styles}">`;
          spanOpen = true;
        } else {
          spanOpen = false;
        }
        currentStyles = styles;
        currentBg = bg;
        currentFg = fg;
      }

      html += this._escapeHtml(char);
    }

    if (spanOpen) {
      html += '</span>';
    }

    rowElement.innerHTML = html;
  }

  private _calculateDimensions(): IRenderDimensions {
    const containerRect = this._container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(this._container);
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
    this._rowContainer.style.lineHeight = `${cellHeight}px`;
    this._cursorElement.style.width = `${this._dimensions.css.cell.width}px`;
    this._cursorElement.style.height = `${cellHeight}px`;
  }

  private _ensureRowElements(rows: number): void {
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
    const buffer = this._terminal.buffer?.active;
    if (
      !buffer ||
      typeof buffer.x !== 'number' ||
      typeof buffer.y !== 'number'
    ) {
      // If buffer is not available, position cursor at 0,0
      this._cursorX = 0;
      this._cursorY = 0;
    } else {
      this._cursorX = buffer.x;
      this._cursorY = buffer.y;
    }

    const x = this._cursorX * this._dimensions.css.cell.width;
    const y = this._cursorY * this._dimensions.css.cell.height;

    this._cursorElement.style.left = `${x}px`;
    this._cursorElement.style.top = `${y}px`;
    this._cursorElement.style.display = 'block';
  }

  private _getColor(color: number): string {
    if (color === -1) {
      return '';
    }

    if (color < 16) {
      const colors = [
        '#000000',
        '#800000',
        '#008000',
        '#808000',
        '#000080',
        '#800080',
        '#008080',
        '#c0c0c0',
        '#808080',
        '#ff0000',
        '#00ff00',
        '#ffff00',
        '#0000ff',
        '#ff00ff',
        '#00ffff',
        '#ffffff',
      ];
      return colors[color] ?? '';
    }

    if (color < 232) {
      const n = color - 16;
      const r = Math.floor(n / 36);
      const g = Math.floor((n % 36) / 6);
      const b = n % 6;
      const toHex = (c: number) =>
        c === 0 ? '00' : (55 + c * 40).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    if (color < 256) {
      const gray = 8 + (color - 232) * 10;
      const hex = gray.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }

    return '';
  }

  private _escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private _updateSelection(): void {
    const rows = this._rowContainer.children;

    for (const row of Array.from(rows)) {
      const rowElement = row as HTMLElement;
      rowElement.classList.remove(
        'xterm-custom-selection',
        'xterm-custom-column-selection'
      );
    }

    if (!this._selectionStart || !this._selectionEnd) {
      return;
    }

    const [, startRow] = this._selectionStart;
    const [, endRow] = this._selectionEnd;

    const actualStartRow = Math.min(startRow, endRow);
    const actualEndRow = Math.max(startRow, endRow);

    // Apply selection styling - column mode support could be added here
    const selectionClass = this._columnSelectMode
      ? 'xterm-custom-column-selection'
      : 'xterm-custom-selection';

    for (let row = actualStartRow; row <= actualEndRow; row++) {
      if (row >= 0 && row < rows.length) {
        const rowElement = rows[row] as HTMLElement;
        rowElement.classList.add(selectionClass);
      }
    }
  }

  private _requestRedraw(start: number, end: number): void {
    this._eventEmitter.emit('requestRedraw', { start, end });
  }
}
