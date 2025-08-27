import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { renderHook, waitFor, render } from '@testing-library/react';
import { act } from 'react';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  waitForTerminalOutput,
  getServerInfo,
} from './test-utils';

// Import the actual session store - we want to test it without mocking
import SessionStore from '../src/stores/session_store';
import Terminal from '../src/components/terminal';

// Mock only the API module to point to our test server
vi.mock('../src/tools/api', () => {
  let testPort = 6847;

  return {
    default: {
      init: vi.fn(),
      isReady: () => true,
      getBaseUrl: () => `http://localhost:${testPort}`,
      get: async (params: { url: string }) => {
        const serverInfo = getServerInfo();
        if (serverInfo) {
          testPort = serverInfo.port;
        }
        const url = `http://localhost:${testPort}${params.url}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          return { err: null, status: response.status, body: data };
        } catch (error) {
          return { err: error, status: 0, body: null };
        }
      },
      post: async (params: { url: string; body?: any }) => {
        const serverInfo = getServerInfo();
        if (serverInfo) {
          testPort = serverInfo.port;
        }
        const url = `http://localhost:${testPort}${params.url}`;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: params.body ? JSON.stringify(params.body) : undefined,
          });
          const data = await response.json();
          return { err: null, status: response.status, body: data };
        } catch (error) {
          return { err: error, status: 0, body: null };
        }
      },
    },
  };
});

describe('Session Store - End-to-End Tests', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches real session list from server', async () => {
    // Create a test session on the server
    const sessionName = 'store-test-session-1';
    await createTestSession(serverInfo.port, sessionName);

    // Use the session store to fetch sessions
    const { result } = renderHook(() => SessionStore.useList());

    // Initially should be undefined (not fetched yet)
    expect(result.current).toBeUndefined();

    // Fetch sessions from the server
    await act(async () => {
      await SessionStore.fetch();
    });

    // Wait for the store to update
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    // Verify we got real session data
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current!.length).toBeGreaterThan(0);

    const session = result.current!.find((s) => s.sessionName === sessionName);
    expect(session).toBeDefined();
    expect(session!.sessionName).toBe(sessionName);
    expect(session!.created).toBeDefined();
    expect(Array.isArray(session!.terminals)).toBe(true);
  });

  it('useSession hook returns correct session from real data', async () => {
    const sessionName = 'store-test-session-2';
    await createTestSession(serverInfo.port, sessionName);

    // Fetch sessions first
    await act(async () => {
      await SessionStore.fetch();
    });

    // Test the useSession hook
    const { result } = renderHook(() => SessionStore.useSession(sessionName));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current!.sessionName).toBe(sessionName);
    expect(result.current!.created).toBeDefined();
    expect(typeof result.current!.created).toBe('string');
    expect(Array.isArray(result.current!.clients)).toBe(true);
    expect(Array.isArray(result.current!.terminals)).toBe(true);
    expect(typeof result.current!.terminalParams).toBe('object');
    expect(result.current!.terminalParams.rows).toBeGreaterThan(0);
    expect(result.current!.terminalParams.columns).toBeGreaterThan(0);
  });

  it('detects session updates when new sessions are created', async () => {
    // Initial fetch
    await act(async () => {
      await SessionStore.fetch();
    });

    const { result } = renderHook(() => SessionStore.useList());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const initialCount = result.current!.length;

    // Create a new session on the server
    const newSessionName = 'store-test-session-3';
    await createTestSession(serverInfo.port, newSessionName);

    // Fetch again to get updated list
    await act(async () => {
      await SessionStore.fetch();
    });

    await waitFor(() => {
      expect(result.current!.length).toBeGreaterThan(initialCount);
    });

    // Verify the new session is in the list
    const newSession = result.current!.find(
      (s) => s.sessionName === newSessionName
    );
    expect(newSession).toBeDefined();
    expect(newSession!.sessionName).toBe(newSessionName);
  });

  it('handles session with active terminal data', async () => {
    const sessionName = 'store-test-session-4';
    await createTestSession(serverInfo.port, sessionName);

    // Execute some commands to create terminal content
    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "Terminal content test"\n'
    );
    await waitForTerminalOutput(200);

    await writeToSession(serverInfo.port, sessionName, 'pwd\n');
    await waitForTerminalOutput(100);

    // Fetch sessions
    await act(async () => {
      await SessionStore.fetch();
    });

    const { result } = renderHook(() => SessionStore.useSession(sessionName));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const session = result.current!;

    // Verify session structure
    expect(session.activeTerminal).toBeDefined();
    if (session.activeTerminal) {
      expect(typeof session.activeTerminal.terminalId).toBe('number');
      expect(typeof session.activeTerminal.normal).toBe('object');
      expect(Array.isArray(session.activeTerminal.normal.buffer)).toBe(true);
      expect(typeof session.activeTerminal.normal.cursor).toBe('object');
      expect(typeof session.activeTerminal.startY).toBe('number');

      // Verify cursor properties
      const cursor = session.activeTerminal.normal.cursor;
      expect(typeof cursor.x).toBe('number');
      expect(typeof cursor.y).toBe('number');
      expect(typeof cursor.visible).toBe('boolean');
      expect(typeof cursor.blinking).toBe('boolean');

      // Instead of checking buffer, render the terminal and verify DOM content
      const { container } = render(<Terminal session={session} zoom='FIT' />);

      await waitFor(() => {
        const terminalInner = container.querySelector(
          '[data-testid="terminal-inner"]'
        );
        expect(terminalInner).toBeInTheDocument();
      });

      // Wait for xterm to render content to DOM
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const terminalInner = container.querySelector(
        '[data-testid="terminal-inner"]'
      );
      const domContent = terminalInner?.textContent || '';

      // Verify that xterm has rendered some content to the DOM
      expect(domContent.length).toBeGreaterThan(0);
      expect(domContent.trim()).not.toBe('');
    }
  });

  it('handles multiple sessions correctly', async () => {
    // Create multiple sessions
    const sessionNames = [
      'multi-session-1',
      'multi-session-2',
      'multi-session-3',
    ];

    for (const name of sessionNames) {
      await createTestSession(serverInfo.port, name);
      await writeToSession(
        serverInfo.port,
        name,
        `echo "Content for ${name}"\n`
      );
      await waitForTerminalOutput(100);
    }

    // Fetch all sessions
    await act(async () => {
      await SessionStore.fetch();
    });

    const { result } = renderHook(() => SessionStore.useList());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current!.length).toBeGreaterThanOrEqual(
        sessionNames.length
      );
    });

    // Verify all our sessions are present
    for (const name of sessionNames) {
      const session = result.current!.find((s) => s.sessionName === name);
      expect(session).toBeDefined();
      expect(session!.sessionName).toBe(name);
    }

    // Test individual session hooks
    for (const name of sessionNames) {
      const { result: sessionResult } = renderHook(() =>
        SessionStore.useSession(name)
      );

      await waitFor(() => {
        expect(sessionResult.current).toBeDefined();
      });

      expect(sessionResult.current!.sessionName).toBe(name);

      // Verify each session has terminal content by rendering and checking DOM
      if (sessionResult.current!.activeTerminal) {
        const { container } = render(
          <Terminal session={sessionResult.current!} zoom='FIT' />
        );

        await waitFor(() => {
          const terminalInner = container.querySelector(
            '[data-testid="terminal-inner"]'
          );
          expect(terminalInner).toBeInTheDocument();
        });

        // Wait for xterm to render content to DOM
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        });

        const terminalInner = container.querySelector(
          '[data-testid="terminal-inner"]'
        );
        const domContent = terminalInner?.textContent || '';

        // Verify that xterm has rendered content to the DOM
        expect(domContent.length).toBeGreaterThan(0);
      }
    }
  });

  it('handles session store reactivity correctly', async () => {
    const sessionName = 'reactivity-test-session';

    // Start with empty list
    const { result } = renderHook(() => SessionStore.useList());

    // Initial fetch
    await act(async () => {
      await SessionStore.fetch();
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const initialSessions = result.current!.filter(
      (s) => s.sessionName === sessionName
    );
    expect(initialSessions.length).toBe(0);

    // Create new session
    await createTestSession(serverInfo.port, sessionName);

    // Fetch again - this should trigger a re-render
    await act(async () => {
      await SessionStore.fetch();
    });

    await waitFor(() => {
      const updatedSessions = result.current!.filter(
        (s) => s.sessionName === sessionName
      );
      expect(updatedSessions.length).toBe(1);
    });

    // Verify the session data is complete
    const session = result.current!.find((s) => s.sessionName === sessionName);
    expect(session).toBeDefined();
    expect(session!.sessionName).toBe(sessionName);
    expect(session!.terminals.length).toBeGreaterThan(0);
  });

  it('handles error cases gracefully', async () => {
    // Test with non-existent session
    const { result } = renderHook(() =>
      SessionStore.useSession('non-existent-session')
    );

    await act(async () => {
      await SessionStore.fetch();
    });

    // Should return undefined for non-existent session
    expect(result.current).toBeUndefined();
  });

  it('maintains session data consistency across multiple fetches', async () => {
    const sessionName = 'consistency-test-session';
    await createTestSession(serverInfo.port, sessionName);

    // First fetch
    await act(async () => {
      await SessionStore.fetch();
    });

    const { result } = renderHook(() => SessionStore.useSession(sessionName));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const firstFetchData = result.current!;

    // Second fetch (should be consistent)
    await act(async () => {
      await SessionStore.fetch();
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const secondFetchData = result.current!;

    // Data should be consistent
    expect(firstFetchData.sessionName).toBe(secondFetchData.sessionName);
    expect(firstFetchData.created).toBe(secondFetchData.created);
    expect(firstFetchData.terminals.length).toBe(
      secondFetchData.terminals.length
    );
  });

  it('handles session with complex terminal state', async () => {
    const sessionName = 'complex-state-session';
    await createTestSession(serverInfo.port, sessionName);

    // Create complex terminal state with various commands
    const commands = [
      'ls -la',
      'echo "Multi-line\\noutput\\ntest"',
      'cat /etc/hostname',
      'whoami',
      'date',
    ];

    for (const cmd of commands) {
      await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
      await waitForTerminalOutput(100);
    }

    await act(async () => {
      await SessionStore.fetch();
    });

    const { result } = renderHook(() => SessionStore.useSession(sessionName));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const session = result.current!;
    expect(session.activeTerminal).toBeDefined();

    if (session.activeTerminal) {
      // Instead of checking buffer content, render the terminal and verify DOM
      const { container } = render(<Terminal session={session} zoom='FIT' />);

      await waitFor(() => {
        const terminalInner = container.querySelector(
          '[data-testid="terminal-inner"]'
        );
        expect(terminalInner).toBeInTheDocument();
      });

      // Wait for xterm to render content to DOM
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const terminalInner = container.querySelector(
        '[data-testid="terminal-inner"]'
      );
      const domContent = terminalInner?.textContent || '';

      // Verify that xterm has rendered substantial content to the DOM
      expect(domContent.length).toBeGreaterThan(50);
      expect(domContent.trim()).not.toBe('');

      // Verify cursor position is reasonable
      const cursor = session.activeTerminal.normal.cursor;
      expect(cursor.x).toBeGreaterThanOrEqual(0);
      expect(cursor.y).toBeGreaterThanOrEqual(0);
    }
  });
});
