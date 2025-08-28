import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { XTermCustomRenderer } from '../src/components/xterm_custom_renderer';

const createMockTerminal = () => ({
  rows: 24,
  cols: 80,
  options: { cursorBlink: true },
  element: null as HTMLElement | null,
  buffer: { active: { cursorX: 0, cursorY: 0, getLine: () => null } },
});

describe('XTermCustomRenderer', () => {
  let container: HTMLElement;
  let terminal: ReturnType<typeof createMockTerminal>;
  let renderer: XTermCustomRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '14px';
    document.body.appendChild(container);

    container.getBoundingClientRect = () => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const originalCreateElement = document.createElement;
    document.createElement = function (tagName: string) {
      const element = originalCreateElement.call(this, tagName);
      if (tagName === 'span') {
        element.getBoundingClientRect = () => ({
          width: 8.4, // Typical monospace character width
          height: 16.8, // Typical character height
          top: 0,
          left: 0,
          bottom: 16.8,
          right: 8.4,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        });
      }
      return element;
    };

    terminal = createMockTerminal();
    terminal.element = container;
    renderer = new XTermCustomRenderer(terminal as any);
  });

  afterEach(() => {
    renderer.dispose();
    document.body.removeChild(container);
  });

  it('should create renderer without initial DOM structure', () => {
    // Initially no DOM structure should exist
    expect(container.children.length).toBe(0);
    expect(container.querySelector('.xterm-custom-rows')).toBeFalsy();
    expect(container.querySelector('.xterm-custom-cursor')).toBeFalsy();
  });

  it('should create DOM structure when renderRows is called', () => {
    renderer.renderRows(0, 5);

    const overlay = container.querySelector('.xterm-custom-overlay');
    const rowContainer = container.querySelector('.xterm-custom-rows');
    const cursorElement = container.querySelector('.xterm-custom-cursor');

    expect(overlay).toBeTruthy();
    expect(rowContainer).toBeTruthy();
    expect(cursorElement).toBeTruthy();
    expect(rowContainer?.children.length).toBe(24); // terminal.rows
  });

  it('should verify no default renderer elements exist', () => {
    renderer.renderRows(0, 5);

    // Verify no canvas elements (default renderer uses canvas)
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(0);

    // Verify no default xterm viewport elements
    const viewports = container.querySelectorAll('.xterm-viewport');
    expect(viewports.length).toBe(0);

    // Verify our custom elements exist
    const customOverlay = container.querySelector('.xterm-custom-overlay');
    const customRows = container.querySelector('.xterm-custom-rows');
    expect(customOverlay).toBeTruthy();
    expect(customRows).toBeTruthy();
  });

  it('should have proper dimensions', () => {
    const dimensions = renderer.dimensions;

    expect(dimensions.css.canvas.width).toBeGreaterThan(0);
    expect(dimensions.css.canvas.height).toBeGreaterThan(0);
    expect(dimensions.css.cell.width).toBeGreaterThan(0);
    expect(dimensions.css.cell.height).toBeGreaterThan(0);
  });

  it('should handle resize correctly', () => {
    renderer.handleResize(100, 30);

    const rowContainer = container.querySelector('.xterm-custom-rows');
    expect(rowContainer?.children.length).toBe(30);
  });

  it('should handle focus and blur', () => {
    renderer.handleFocus(); // This should create the cursor element

    const cursorElement = container.querySelector(
      '.xterm-custom-cursor'
    ) as HTMLElement;

    expect(cursorElement).toBeTruthy();
    expect(cursorElement.style.opacity).toBe('1');

    renderer.handleBlur();
    expect(cursorElement.style.opacity).toBe('0.5');
  });

  it('should handle selection changes', () => {
    renderer.handleResize(80, 24); // Ensure we have rows

    renderer.handleSelectionChanged([0, 0], [10, 2], false);

    const rowContainer = container.querySelector('.xterm-custom-rows');
    const selectedRows = rowContainer?.querySelectorAll(
      '.xterm-custom-selection'
    );

    expect(selectedRows?.length).toBeGreaterThan(0);
  });

  it('should handle column selection mode', () => {
    renderer.handleResize(80, 24); // Ensure we have rows

    renderer.handleSelectionChanged([0, 0], [10, 2], true);

    const rowContainer = container.querySelector('.xterm-custom-rows');
    const selectedRows = rowContainer?.querySelectorAll(
      '.xterm-custom-column-selection'
    );

    expect(selectedRows?.length).toBeGreaterThan(0);
  });

  it('should clear selection when selection is undefined', () => {
    renderer.handleResize(80, 24);

    renderer.handleSelectionChanged([0, 0], [10, 2], false);

    renderer.handleSelectionChanged(undefined, undefined, false);

    const rowContainer = container.querySelector('.xterm-custom-rows');
    const selectedRows = rowContainer?.querySelectorAll(
      '.xterm-custom-selection, .xterm-custom-column-selection'
    );

    expect(selectedRows?.length).toBe(0);
  });

  it('should clear all content when clear is called', () => {
    renderer.handleResize(80, 24);

    renderer.clear();

    const rowContainer = container.querySelector('.xterm-custom-rows');
    const cursorElement = container.querySelector(
      '.xterm-custom-cursor'
    ) as HTMLElement;

    expect(rowContainer?.innerHTML).toBe('');
    expect(cursorElement.style.display).toBe('none');
  });

  it('should dispose properly and remove all custom elements', () => {
    renderer.renderRows(0, 5); // Create DOM structure

    const initialCustomElements = container.querySelectorAll(
      '.xterm-custom-overlay, .xterm-custom-rows, .xterm-custom-cursor'
    );
    expect(initialCustomElements.length).toBeGreaterThan(0);

    renderer.dispose();

    const remainingCustomElements = container.querySelectorAll(
      '.xterm-custom-overlay, .xterm-custom-rows, .xterm-custom-cursor'
    );
    expect(remainingCustomElements.length).toBe(0);
  });

  it('should handle device pixel ratio changes', () => {
    const originalRatio = window.devicePixelRatio;

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    });

    renderer.handleDevicePixelRatioChange();

    const dimensions = renderer.dimensions;
    expect(dimensions.device.canvas.width).toBeGreaterThan(
      dimensions.css.canvas.width
    );

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: originalRatio,
    });
  });

  it('should handle missing terminal element gracefully', () => {
    terminal.element = null;
    const rendererWithoutElement = new XTermCustomRenderer(terminal as any);

    // Should not throw errors when terminal element is missing
    expect(() => {
      rendererWithoutElement.renderRows(0, 5);
      rendererWithoutElement.handleResize(80, 24);
      rendererWithoutElement.handleFocus();
      rendererWithoutElement.clear();
    }).not.toThrow();

    rendererWithoutElement.dispose();
  });
});
