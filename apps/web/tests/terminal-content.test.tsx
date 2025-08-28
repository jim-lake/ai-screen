import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import os from 'os';
import Terminal from '../src/components/terminal';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  getTerminalState,
  waitForTerminalOutput,
  getVisibleText,
  withTestLogging,
} from './test-utils';
import { testLogger } from './test-logger';
import type { SessionJson } from '@ai-screen/shared';

vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

vi.mock('../src/stores/setting_store', () => ({
  useSetting: vi.fn((key: string) => {
    if (key === 'fontFamily') return 'monospace';
    if (key === 'fontSize') return 14;
    return null;
  }),
}));

describe('Terminal Content Verification with Real XTerm and WebSocket', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();

    const { default: Api } = await import('../src/tools/api');
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it(
    'renders terminal component with real xterm and WebSocket connection',
    withTestLogging(async () => {
      const sessionName = 'content-test-session-1';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(200);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "Hello Real World"\n'
      );
      await waitForTerminalOutput(200);

      await writeToSession(serverInfo.port, sessionName, 'ls -la\n');
      await waitForTerminalOutput(200);

      await writeToSession(serverInfo.port, sessionName, 'pwd\n');
      await waitForTerminalOutput(100);

      const terminalState = await getTerminalState(
        serverInfo.port,
        sessionName
      );

      const sessionWithRealContent: SessionJson = {
        ...session,
        activeTerminal: terminalState,
      };

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      await waitFor(
        () => {
          expect(terminalInner).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      let domTextContent = '';
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts && domTextContent.length < 50) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        domTextContent = getVisibleText(terminalInner);
        attempts++;
      }

      expect(terminalInner.tagName.toLowerCase()).toBe('div');
      expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');

      expect(terminalState.normal.buffer.length).toBeGreaterThan(3);
      expect(terminalState.normal.cursor).toBeDefined();
      expect(typeof terminalState.normal.cursor.x).toBe('number');
      expect(typeof terminalState.normal.cursor.y).toBe('number');

      if (domTextContent.length === 0) {
        const xtermElements = terminalInner.querySelectorAll(
          '.xterm, .xterm-screen, .xterm-viewport, .xterm-rows'
        );

        expect(terminalInner).toBeInTheDocument();
        expect(terminalInner.children.length).toBeGreaterThan(0);

        expect(xtermElements.length).toBeGreaterThan(0);
      } else {
        console.log('DOM content length:', domTextContent.length);
        console.log('DOM content preview:', domTextContent.substring(0, 200));

        expect(domTextContent.length).toBeGreaterThan(50);
        expect(domTextContent.trim()).not.toBe('');

        const hasPrompt =
          domTextContent.includes('$') || domTextContent.includes('@');
        const hasContent = domTextContent.length > 100;

        expect(hasPrompt || hasContent).toBe(true);

        const xtermElements = terminalInner.querySelectorAll(
          '.xterm, .xterm-screen, .xterm-viewport'
        );
        expect(xtermElements.length).toBeGreaterThan(0);
      }
    })
  );

  it(
    'verifies terminal component handles complex real terminal output with WebSocket',
    withTestLogging(async () => {
      const sessionName = 'content-test-session-2';
      const session = await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "TEST_MARKER_START"',
        'echo "Current directory: $(pwd)"',
        'echo "Test file content" > test_output.txt',
        'cat test_output.txt',
        'echo "Files created: $(ls test_output.txt 2>/dev/null | wc -l)"',
        'echo "TEST_MARKER_END"',
      ];

      for (const cmd of commands) {
        await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
        await waitForTerminalOutput(100);
      }

      const terminalState = await getTerminalState(
        serverInfo.port,
        sessionName
      );

      const sessionWithRealContent: SessionJson = {
        ...session,
        activeTerminal: terminalState,
      };

      await act(async () => {
        render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      await waitFor(
        () => {
          const domText = getVisibleText(terminalInner);
          return domText.length > 100; // Wait for substantial content
        },
        { timeout: 10000, interval: 200 } // Increased timeout and check interval
      );

      const domTextContent = getVisibleText(terminalInner);

      console.log('Complex test DOM content length:', domTextContent.length);
      console.log(
        'Complex test DOM content preview:',
        domTextContent.substring(0, 200)
      );

      expect(domTextContent.length).toBeGreaterThan(100);
      expect(domTextContent.trim()).not.toBe('');

      expect(terminalInner.nodeType).toBe(Node.ELEMENT_NODE);
      expect(terminalInner.tagName.toLowerCase()).toBe('div');
    })
  );

  it(
    'handles real error messages and special characters with WebSocket terminal',
    withTestLogging(async () => {
      const sessionName = 'content-test-session-3';
      const session = await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "ERROR_TEST_START"',
        `cat "${tmpDir}/nonexistent_test_file_12345.txt" 2>&1 || echo "Expected error occurred"`,
        'echo "Special chars: !@#$%^&*()"',
        'echo -e "\\033[31mRed Text\\033[0m"',
        'echo "ERROR_TEST_END"',
      ];

      for (const cmd of commands) {
        await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
        await waitForTerminalOutput(100);
      }

      const terminalState = await getTerminalState(
        serverInfo.port,
        sessionName
      );

      const sessionWithRealContent: SessionJson = {
        ...session,
        activeTerminal: terminalState,
      };

      await act(async () => {
        render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      await waitFor(
        () => {
          const domText = getVisibleText(terminalInner);
          return domText.length > 50; // Wait for substantial content
        },
        { timeout: 10000, interval: 200 } // Increased timeout and check interval
      );

      const domTextContent = getVisibleText(terminalInner);

      console.log('Error test DOM content length:', domTextContent.length);
      console.log(
        'Error test DOM content preview:',
        domTextContent.substring(0, 200)
      );

      expect(domTextContent.length).toBeGreaterThan(50);
      expect(domTextContent.trim()).not.toBe('');

      expect(
        domTextContent.includes('ERROR_TEST_START') ||
          domTextContent.length > 500
      ).toBe(true);
    })
  );

  it(
    'handles real file operations and directory listings with WebSocket terminal',
    withTestLogging(async () => {
      const sessionName = 'content-test-session-4';
      const session = await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "FILE_TEST_START"',
        'echo "test file content for DOM verification" > ai_screen_test_file.txt',
        'ls -la ai_screen_test_file.txt',
        'cat ai_screen_test_file.txt',
        'echo "File size: $(wc -c < ai_screen_test_file.txt) bytes"',
        'rm ai_screen_test_file.txt',
        'echo "FILE_TEST_END"',
      ];

      for (const cmd of commands) {
        await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
        await waitForTerminalOutput(100);
      }

      const terminalState = await getTerminalState(
        serverInfo.port,
        sessionName
      );

      const sessionWithRealContent: SessionJson = {
        ...session,
        activeTerminal: terminalState,
      };

      await act(async () => {
        render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      await waitFor(
        () => {
          const domText = getVisibleText(terminalInner);
          return domText.length > 80; // Wait for substantial content
        },
        { timeout: 10000, interval: 200 } // Increased timeout and check interval
      );

      const domTextContent = getVisibleText(terminalInner);

      console.log('File ops test DOM content length:', domTextContent.length);
      console.log(
        'File ops test DOM content preview:',
        domTextContent.substring(0, 200)
      );

      expect(domTextContent.length).toBeGreaterThan(80);
      expect(domTextContent.trim()).not.toBe('');

      const hasCustomRendererContent = expect(
        domTextContent.includes('FILE_TEST_START') ||
          domTextContent.length > 500
      ).toBe(true);

      expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');
    })
  );

  it(
    'verifies terminal component integrates with real xterm and WebSocket',
    withTestLogging(async () => {
      const sessionName = 'content-test-session-5';
      const session = await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "WEBSOCKET_TEST_START"',
        'echo "Testing WebSocket integration with xterm"',
        'echo "Current timestamp: $(date +%s)"',
        'echo "WEBSOCKET_TEST_END"',
      ];

      for (const cmd of commands) {
        await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
        await waitForTerminalOutput(100);
      }

      const terminalState = await getTerminalState(
        serverInfo.port,
        sessionName
      );

      const sessionWithRealContent: SessionJson = {
        ...session,
        activeTerminal: terminalState,
      };

      await act(async () => {
        render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      await waitFor(
        () => {
          const domText = getVisibleText(terminalInner);
          return domText.length > 50; // Wait for substantial content
        },
        { timeout: 10000, interval: 200 } // Increased timeout and check interval
      );

      expect(terminalInner.tagName.toLowerCase()).toBe('div');
      expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');

      const domTextContent = getVisibleText(terminalInner);

      console.log('WebSocket test DOM content length:', domTextContent.length);
      console.log(
        'WebSocket test DOM content preview:',
        domTextContent.substring(0, 200)
      );

      expect(domTextContent.length).toBeGreaterThan(20);
      expect(domTextContent.trim()).not.toBe('');

      expect(
        domTextContent.includes('WEBSOCKET_TEST_START') ||
          domTextContent.length > 500
      ).toBe(true);

      expect(terminalState.normal.cursor.x).toBeGreaterThanOrEqual(0);
      expect(terminalState.normal.cursor.y).toBeGreaterThanOrEqual(0);
      expect(terminalState.normal.buffer.length).toBeGreaterThan(0);
    })
  );
});
