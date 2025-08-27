import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import {
  XTermCustomRenderer,
  type ITerminalCore,
} from './xterm_custom_renderer';

export class CustomRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: XTermCustomRenderer;

  public activate(terminal: Terminal): void {
    // We need to wait for the terminal to be opened before we can replace the renderer
    // The terminal.open() call happens after loadAddon(), so we need to defer this
    setTimeout(() => {
      this._replaceRenderer(terminal);
    }, 0);
  }

  private _replaceRenderer(terminal: Terminal): void {
    const core = (terminal as unknown as { _core: unknown })._core as {
      screenElement?: HTMLElement;
      _renderService: { setRenderer(renderer: XTermCustomRenderer): void };
    };

    // Make sure the terminal has been opened and screenElement exists
    if (!core.screenElement) {
      // If screenElement doesn't exist yet, try again later
      setTimeout(() => {
        this._replaceRenderer(terminal);
      }, 10);
      return;
    }

    // Create our custom renderer with the core terminal instance
    this._renderer = new XTermCustomRenderer(
      core as unknown as ITerminalCore,
      core.screenElement
    );

    // Replace the built-in renderer with our custom one
    core._renderService.setRenderer(this._renderer);
  }

  public dispose(): void {
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }
  }
}
