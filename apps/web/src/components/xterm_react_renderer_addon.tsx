import { useCallback, useSyncExternalStore } from 'react';
import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import type {
  IRenderer,
  IRenderDimensions,
  IRequestRedrawEvent,
} from '@xterm/xterm/src/browser/renderer/shared/Types';
import type { IEvent } from '@xterm/xterm';
import { EventEmitter } from 'events';

import { measureCharSize } from '../tools/measure';

interface TerminalCore extends Terminal {
  _core: {
    onWillOpen: (callback: () => void) => IDisposable;
    _renderService?: {
      setRenderer?: (renderer: unknown) => void;
      handleResize?: (cols: number, rows: number) => void;
    };
    _createRenderer: () => unknown;
  };
}

export interface TerminalDirty {
  rowSet: Set<number>;
  cursor: boolean;
}

let g_terminalCount = 0;
const g_terminalLabelMap = new Map<Terminal, string>();
const g_updateMap = new Map<Terminal, TerminalDirty>();
const g_eventEmitter = new EventEmitter();

function _getTerminalLabel(terminal: Terminal): string {
  let label = g_terminalLabelMap.get(terminal);
  if (!label) {
    label = `terminal-${g_terminalCount++}`;
    g_terminalLabelMap.set(terminal, label);
  }
  return label;
}
function _emit(terminal: Terminal) {
  g_eventEmitter.emit(_getTerminalLabel(terminal));
}
export function useRenderUpdate(terminal: Terminal) {
  const _get = useCallback(() => {
    return g_updateMap.get(terminal);
  }, [terminal]);
  const _sub = useCallback(
    (callback: () => void) => {
      const label = _getTerminalLabel(terminal);
      g_eventEmitter.on(label, callback);
      return () => {
        g_eventEmitter.removeListener(label, callback);
      };
    },
    [terminal]
  );
  return useSyncExternalStore(_sub, _get);
}

class ReactRenderer implements IRenderer {
  private readonly _terminal: Terminal;
  private _dimensions: IRenderDimensions;
  private _disposed = false;

  constructor(terminal: Terminal) {
    this._terminal = terminal;
    this._dimensions = this._updateDimensions();
  }
  public get dimensions(): IRenderDimensions {
    return this._dimensions;
  }
  public get onRequestRedraw(): IEvent<IRequestRedrawEvent> {
    return (_listener: (arg: IRequestRedrawEvent) => void): IDisposable => {
      return {
        dispose: () => {
          //noop
        },
      };
    };
  }
  public dispose(): void {
    this._disposed = true;
  }
  public handleDevicePixelRatioChange(): void {
    this._updateDimensions();
    this.renderRows(0, this._terminal.rows - 1);
  }
  public handleResize(_cols: number, rows: number): void {
    this._updateDimensions();
    this.renderRows(0, rows - 1);
  }
  public handleCharSizeChanged(): void {
    this._updateDimensions();
    this.renderRows(0, this._terminal.rows - 1);
  }
  public handleBlur(): void {
    // noop
  }

  public handleFocus(): void {
    // noop
  }
  public handleSelectionChanged(
    _start: [number, number] | undefined,
    _end: [number, number] | undefined,
    _columnSelectMode: boolean
  ): void {
    // noop
  }

  public handleCursorMove(): void {
    // noop
  }

  public clear(): void {
    // noop
  }

  public renderRows(start: number, end: number): void {
    if (this._disposed) {
      return;
    }
    const old = g_updateMap.get(this._terminal);
    const new_dirty = {
      rowSet: old?.rowSet ?? new Set<number>(),
      cursor: old?.cursor ?? false,
    };
    for (let i = start; i <= end; i++) {
      new_dirty.rowSet.add(i);
    }
    g_updateMap.set(this._terminal, new_dirty);
    _emit(this._terminal);
  }

  private _updateDimensions(): IRenderDimensions {
    const ratio = window.devicePixelRatio || 1;
    const size = measureCharSize({
      fontFamily: this._terminal.options.fontFamily ?? 'monospace',
      fontSize: this._terminal.options.fontSize ?? 12,
      lineHeight: this._terminal.options.lineHeight ?? 1.0,
    });
    const total_height = this._terminal.rows * size.height;
    const total_width = this._terminal.rows * size.width;

    this._dimensions = {
      css: {
        canvas: { width: total_width, height: total_height },
        cell: { width: size.width, height: size.height },
      },
      device: {
        canvas: { width: total_width * ratio, height: total_height * ratio },
        cell: { width: size.height * ratio, height: size.width * ratio },
        char: {
          width: size.width * ratio,
          height: size.height * ratio,
          top: 0,
          left: 0,
        },
      },
    };
    return this._dimensions;
  }
}
export class ReactRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: ReactRenderer;
  private _terminal?: Terminal;
  private _openDispose?: IDisposable;
  public activate(terminal: Terminal): void {
    this._terminal = terminal;
    const terminalWithCore = terminal as TerminalCore;
    const core = terminalWithCore._core;
    if (core._renderService) {
      this._activate();
    } else {
      this._openDispose = core.onWillOpen(this._activate);
    }
  }
  private readonly _activate = () => {
    if (this._terminal) {
      const terminalWithCore = this._terminal as TerminalCore;
      const core = terminalWithCore._core;
      const renderService = core._renderService;
      if (renderService) {
        this._renderer = new ReactRenderer(this._terminal);
        renderService.setRenderer?.(this._renderer);
      }
    }
  };
  public dispose(): void {
    if (this._terminal) {
      const core = (this._terminal as TerminalCore)._core;
      core._renderService?.setRenderer?.(core._createRenderer());
      core._renderService?.handleResize?.(
        this._terminal.cols,
        this._terminal.rows
      );
      this._terminal = undefined;
    }
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }
    if (this._openDispose) {
      this._openDispose.dispose();
      this._openDispose = undefined;
    }
  }
}
