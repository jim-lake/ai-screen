import '@testing-library/jest-dom';
import { vi } from 'vitest';
import WebSocket from 'ws';

// Suppress React act() warnings in integration tests
// These warnings occur because WebSocket connections and xterm.js rendering
// happen asynchronously and are difficult to wrap in act() properly
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes(
      'An update to Terminal inside a test was not wrapped in act'
    ) ||
      message.includes(
        'When testing, code that causes React state updates should be wrapped into act'
      ))
  ) {
    // Suppress React act() warnings for Terminal component integration tests
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes(
      'An update to Terminal inside a test was not wrapped in act'
    ) ||
      message.includes(
        'When testing, code that causes React state updates should be wrapped into act'
      ))
  ) {
    // Suppress React act() warnings for Terminal component integration tests
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Mock ResizeObserver for xterm.js and component size utilities
global.ResizeObserver = vi
  .fn()
  .mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

// Mock canvas for xterm.js in JSDOM environment
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

// Mock matchMedia for xterm.js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Replace JSDOM's WebSocket with real WebSocket from ws library
global.WebSocket = WebSocket as any;

// Also make it available on window for browser-like code
Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: WebSocket,
});
