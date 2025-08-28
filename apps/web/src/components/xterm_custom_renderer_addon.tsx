/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-shadow */
import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import { XTermCustomRenderer } from './xterm_custom_renderer';

export class CustomRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: XTermCustomRenderer;
  private _terminal?: Terminal;
  private _disposables: IDisposable[] = [];

  public activate(terminal: Terminal): void {
    const core = (terminal as any)._core;
    if (!terminal.element) {
      this.register(core.onWillOpen(() => this.activate(terminal)));
      return;
    }

    this._terminal = terminal;
    const unsafeCore = core;
    const renderService = unsafeCore._renderService;

    this._renderer = this.register(new XTermCustomRenderer(terminal));
    renderService.setRenderer(this._renderer);

    this.register({
      dispose: () => {
        const renderService = (this._terminal as any)._core._renderService;
        renderService.setRenderer((this._terminal as any)._core._createRenderer());
        renderService.handleResize(terminal.cols, terminal.rows);
      }
    });
  }

  private register<T extends IDisposable>(disposable: T): T {
    this._disposables.push(disposable);
    return disposable;
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
    this._renderer = undefined;
    this._terminal = undefined;
  }
}
