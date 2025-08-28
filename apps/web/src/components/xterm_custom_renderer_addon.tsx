import { Terminal } from '@xterm/xterm';
import type { ITerminalAddon, IDisposable } from '@xterm/xterm';
import {
  XTermCustomRenderer,
  type ITerminalCore,
} from './xterm_custom_renderer';

export class CustomRendererAddon implements ITerminalAddon, IDisposable {
  private _renderer?: XTermCustomRenderer;
  private _terminal?: Terminal;
  private _dataDisposable?: IDisposable;
  private _resizeDisposable?: IDisposable;
  private _renderInterval?: NodeJS.Timeout;

  public activate(terminal: Terminal): void {
    this._terminal = terminal;
    // Wait for the terminal to be opened
    setTimeout(() => {
      this._setupCustomRenderer(terminal);
    }, 100);
  }

  private _setupCustomRenderer(terminal: Terminal): void {
    const { element } = terminal;
    if (!element) {
      // Try again later if element is not ready
      setTimeout(() => {
        this._setupCustomRenderer(terminal);
      }, 50);
      return;
    }

    // Create a container for our custom renderer
    const customContainer = document.createElement('div');
    customContainer.className = 'xterm-custom-overlay';
    customContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
    `;

    // Insert our custom container into the terminal element
    element.appendChild(customContainer);

    // Create our custom renderer
    this._renderer = new XTermCustomRenderer(
      terminal as unknown as ITerminalCore,
      customContainer
    );

    // Set up event listeners to trigger rendering
    this._setupEventListeners(terminal);

    // Start periodic rendering to keep content updated
    this._startPeriodicRendering();
  }

  private _setupEventListeners(terminal: Terminal): void {
    if (!this._renderer) {
      return;
    }

    // Listen for data events to trigger rendering
    this._dataDisposable = terminal.onData(() => {
      this._triggerRender();
    });

    // Listen for resize events
    this._resizeDisposable = terminal.onResize(() => {
      if (this._renderer) {
        this._renderer.handleResize(terminal.cols, terminal.rows);
        this._triggerRender();
      }
    });
  }

  private _startPeriodicRendering(): void {
    // Render periodically to ensure content stays updated
    this._renderInterval = setInterval(() => {
      this._triggerRender();
    }, 100); // 10fps for updates
  }

  private _triggerRender(): void {
    if (this._renderer && this._terminal) {
      this._renderer.renderRows(0, this._terminal.rows - 1);
    }
  }

  public dispose(): void {
    if (this._renderInterval) {
      clearInterval(this._renderInterval);
      this._renderInterval = undefined;
    }
    this._dataDisposable?.dispose();
    this._resizeDisposable?.dispose();
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }
  }
}
