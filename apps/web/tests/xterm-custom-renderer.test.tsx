import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { XTermCustomRenderer } from '../src/components/xterm_custom_renderer';

// Mock terminal interface for testing
const createMockTerminal = () => ({
  rows: 24,
  cols: 80,
  options: { cursorBlink: true },
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

    // Mock getBoundingClientRect for JSDOM
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

    // Mock character measurement for test environment
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
    renderer = new XTermCustomRenderer(terminal as any, container);
  });

  afterEach(() => {
    renderer.dispose();
    document.body.removeChild(container);
  });

  it('should create renderer with proper DOM structure', () => {
    expect(container.children.length).toBe(2);

    const rowContainer = container.querySelector('.xterm-custom-rows');
    const cursorElement = container.querySelector('.xterm-custom-cursor');

    expect(rowContainer).toBeTruthy();
    expect(cursorElement).toBeTruthy();
  });

  it('should have proper dimensions', () => {
    const dimensions = renderer.dimensions;

    expect(dimensions.css.canvas.width).toBeGreaterThan(0);
    expect(dimensions.css.canvas.height).toBeGreaterThan(0);
    expect(dimensions.css.cell.width).toBeGreaterThan(0);
    expect(dimensions.css.cell.height).toBeGreaterThan(0);
  });

  it('should handle resize correctly', () => {
    const initialDimensions = renderer.dimensions;

    renderer.handleResize(100, 30);

    const newDimensions = renderer.dimensions;
    expect(newDimensions).toBeDefined();

    // Should have created row elements for the new size
    const rowContainer = container.querySelector('.xterm-custom-rows');
    expect(rowContainer?.children.length).toBe(30);
  });

  it('should handle focus and blur', () => {
    const cursorElement = container.querySelector(
      '.xterm-custom-cursor'
    ) as HTMLElement;

    renderer.handleFocus();
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

    // First set a selection
    renderer.handleSelectionChanged([0, 0], [10, 2], false);

    // Then clear it
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

  it('should dispose properly', () => {
    const initialChildren = container.children.length;

    renderer.dispose();

    expect(container.children.length).toBeLessThan(initialChildren);
  });

  it('should handle device pixel ratio changes', () => {
    const originalRatio = window.devicePixelRatio;

    // Mock a different device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2,
    });

    renderer.handleDevicePixelRatioChange();

    const dimensions = renderer.dimensions;
    expect(dimensions.device.canvas.width).toBeGreaterThan(
      dimensions.css.canvas.width
    );

    // Restore original ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: originalRatio,
    });
  });
});
