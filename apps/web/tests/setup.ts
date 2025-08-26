import '@testing-library/jest-dom';

// Mock WebSocket for tests
global.WebSocket = class MockWebSocket {
  constructor(url: string) {
    // Mock implementation
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }

  addEventListener(event: string, handler: Function) {
    // Mock implementation
  }

  removeEventListener(event: string, handler: Function) {
    // Mock implementation
  }
} as any;
