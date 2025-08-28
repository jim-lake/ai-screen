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
import Terminal from '../src/components/terminal';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  getTerminalState,
  waitForTerminalOutput,
  getServerInfo,
  getVisibleText,
  withTestLogging,
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';
import Api from '../src/tools/api';

vi.mock('../src/tools/storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      if (key === 'AI_SCREEN_CUSTOM_BASE_URL') {
        const serverInfo = getServerInfo();
        if (serverInfo) {
          return { err: null, value: `http://localhost:${serverInfo.port}` };
        }
      }
      return { err: null, value: undefined };
    }),
    setItem: vi.fn(async () => {}),
  },
}));

vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

describe('Terminal Component - End-to-End Tests', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();

    serverInfo = await startTestServer();
    Api.init();
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'renders terminal with real session data from server',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-1';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    })
  );

  it(
    'displays real terminal output after executing commands',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-2';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(200);

      await waitFor(() => {
        const terminalInner = screen.getByTestId('terminal-inner');
        expect(terminalInner).toBeInTheDocument();
      });
      await waitForTerminalOutput(200);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "Hello E2E Test"\n'
      );
      await waitForTerminalOutput(200);

      const textContent = getVisibleText(screen.getByTestId('terminal-inner'));
      console.log('textContent:', textContent);
      expect(textContent).toContain('Hello E2E Test');
    })
  );

  it(
    'handles multiple commands and complex output',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-3';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      await writeToSession(serverInfo.port, sessionName, 'pwd\n');
      await waitForTerminalOutput(100);

      await writeToSession(serverInfo.port, sessionName, 'ls -la\n');
      await waitForTerminalOutput(200);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "Current directory: $(pwd)"\n'
      );
      await waitForTerminalOutput(100);

      await waitFor(() => {
        const terminalInner = screen.getByTestId('terminal-inner');
        expect(terminalInner).toBeInTheDocument();
      });

      const terminalInner = screen.getByTestId('terminal-inner');
      const textContent = getVisibleText(terminalInner);

      expect(textContent).toContain('pwd');
      expect(textContent).toContain('ls -la');
      expect(textContent).toContain('Current directory:');
      expect(textContent.length).toBeGreaterThan(50);
    })
  );

  it(
    'displays file listing output correctly',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-4';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "test content" > test-e2e.txt\n'
      );
      await waitForTerminalOutput(100);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'ls -la test-e2e.txt\n'
      );
      await waitForTerminalOutput(200);

      await writeToSession(serverInfo.port, sessionName, 'cat test-e2e.txt\n');
      await waitForTerminalOutput(100);

      await writeToSession(serverInfo.port, sessionName, 'rm test-e2e.txt\n');
      await waitForTerminalOutput(100);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('test-e2e.txt');
      expect(textContent).toContain('test content');
      expect(textContent).toContain('cat test-e2e.txt');
    })
  );

  it(
    'handles error commands and displays error output',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-5';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'cat nonexistent-file.txt\n'
      );
      await waitForTerminalOutput(200);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'ls /nonexistent-directory\n'
      );
      await waitForTerminalOutput(200);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      const hasErrorMessage =
        textContent.includes('No such file or directory') ||
        textContent.includes('cannot access') ||
        textContent.includes('not found');
      expect(hasErrorMessage).toBe(true);
    })
  );

  it(
    'displays cursor position correctly from real terminal state',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-6';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(200);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo -n "Cursor test: "'
      );
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent.length).toBeGreaterThan(0);
    })
  );

  it(
    'handles terminal resize operations with real server',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-7';
      const session = await createTestSession(serverInfo.port, sessionName);

      const zoomModes: Array<'SHRINK' | 'EXPAND'> = ['SHRINK', 'EXPAND'];

      for (const zoom of zoomModes) {
        const { unmount } = render(<Terminal session={session} zoom={zoom} />);

        await waitFor(() => {
          const terminalInner = screen.getByTestId('terminal-inner');
          expect(terminalInner).toBeInTheDocument();
        });

        unmount();
      }
    })
  );

  it(
    'processes real ANSI escape sequences from terminal output',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-8';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo -e "\\033[31mRed text\\033[0m"\n'
      );
      await waitForTerminalOutput(100);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo -e "\\033[1mBold text\\033[0m"\n'
      );
      await waitForTerminalOutput(100);

      await writeToSession(serverInfo.port, sessionName, 'ls --color=always\n');
      await waitForTerminalOutput(200);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      const hasAnsiContent =
        textContent.includes('Red text') ||
        textContent.includes('Bold text') ||
        textContent.includes('ls --color=always');
      expect(hasAnsiContent).toBe(true);
    })
  );

  it(
    'maintains terminal state consistency across re-renders',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-9';
      const session = await createTestSession(serverInfo.port, sessionName);

      const { rerender } = render(<Terminal session={session} zoom='EXPAND' />);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "State test 1"\n'
      );
      await waitForTerminalOutput(100);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "State test 2"\n'
      );
      await waitForTerminalOutput(100);

      rerender(<Terminal session={session} zoom='EXPAND' />);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('State test 1');
      expect(textContent).toContain('State test 2');
    })
  );

  it(
    'handles long-running commands and output streaming',
    withTestLogging(async () => {
      const sessionName = 'e2e-test-session-10';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='EXPAND' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'for i in {1..5}; do echo "Line $i"; sleep 0.1; done\n'
      );

      await waitForTerminalOutput(1000);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);

      const hasMultipleLines =
        textContent.includes('Line 1') && textContent.includes('Line 5');
      expect(hasMultipleLines).toBe(true);
      expect(textContent.length).toBeGreaterThan(50);
    })
  );
});
