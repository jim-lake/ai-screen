import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { act } from 'react';
import Terminal from '../src/components/terminal';
import Api from '../src/tools/api';
import { 
  createTestSession, 
  writeToSession, 
  waitForTerminalOutput,
  startTestServer,
  stopTestServer,
  getVisibleText,
  withTestLogging 
} from './test-utils';

describe('Custom Renderer Integration', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
    Api.init();
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('should use custom renderer and create expected DOM structure', 
    withTestLogging(async () => {
      const sessionName = 'test-custom-renderer';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      // Execute a command to trigger rendering
      await writeToSession(serverInfo.port, sessionName, 'echo "Testing custom renderer"\n');
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      // Verify custom renderer elements exist
      const customOverlay = terminalInner.querySelector('.xterm-custom-overlay');
      const customRows = terminalInner.querySelector('.xterm-custom-rows');
      const customCursor = terminalInner.querySelector('.xterm-custom-cursor');

      expect(customOverlay).toBeTruthy();
      expect(customRows).toBeTruthy();
      expect(customCursor).toBeTruthy();

      // Verify no default renderer elements exist (no canvas elements)
      const canvases = terminalInner.querySelectorAll('canvas');
      expect(canvases.length).toBe(0);

      // Verify the custom renderer actually rendered content
      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('Testing custom renderer');
    })
  );

  it('should handle multiple commands with custom renderer', 
    withTestLogging(async () => {
      const sessionName = 'test-custom-renderer-multi';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      // Execute multiple commands
      await writeToSession(serverInfo.port, sessionName, 'echo "First command"\n');
      await waitForTerminalOutput(300);

      await writeToSession(serverInfo.port, sessionName, 'echo "Second command"\n');
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      // Verify custom renderer is still working
      const customOverlay = terminalInner.querySelector('.xterm-custom-overlay');
      const customRows = terminalInner.querySelector('.xterm-custom-rows');

      expect(customOverlay).toBeTruthy();
      expect(customRows).toBeTruthy();

      // Verify both commands are visible in the DOM
      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('First command');
      expect(textContent).toContain('Second command');
    })
  );
});
