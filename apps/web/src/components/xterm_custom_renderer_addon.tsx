import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import { XTermCustomRenderer } from './xterm_custom_renderer';

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

export class CustomRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: XTermCustomRenderer;
  private _terminal?: Terminal;
  private _disposables: IDisposable[] = [];

  public activate(terminal: Terminal): void {
    const terminalWithCore = terminal as Terminal & TerminalCore;
    const core = terminalWithCore._core;

    if (!terminal.element) {
      this.register(core.onWillOpen(() => this.activate(terminal)));
      return;
    }

    this._terminal = terminal;
    const renderService = core._renderService;

    this._renderer = this.register(new XTermCustomRenderer(terminal));
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
