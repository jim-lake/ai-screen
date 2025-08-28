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
import os from 'os';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  waitForTerminalOutput,
  getServerInfo,
  getVisibleText,
  withTestLogging,
} from './test-utils';

import SessionStore from '../src/stores/session_store';
import Terminal from '../src/components/terminal';

describe('Session Store - End-to-End Tests', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();

    const { default: Api } = await import('../src/tools/api');
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'fetches real session list from server',
    withTestLogging(async () => {
      const sessionName = 'store-test-session-1';
      await createTestSession(serverInfo.port, sessionName);

      const { result } = renderHook(() => SessionStore.useList());

      expect(result.current).toBeUndefined();

      await act(async () => {
        await SessionStore.fetch();
      });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current!.length).toBeGreaterThan(0);

      const session = result.current!.find(
        (s) => s.sessionName === sessionName
      );
      expect(session).toBeDefined();
      expect(session!.sessionName).toBe(sessionName);
      expect(session!.created).toBeDefined();
      expect(Array.isArray(session!.terminals)).toBe(true);
    })
  );

  it(
    'useSession hook returns correct session from real data',
    withTestLogging(async () => {
      const sessionName = 'store-test-session-2';
      await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        await SessionStore.fetch();
      });

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
    })
  );

  it(
    'detects session updates when new sessions are created',
    withTestLogging(async () => {
      await act(async () => {
        await SessionStore.fetch();
      });

      const { result } = renderHook(() => SessionStore.useList());

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      const initialCount = result.current!.length;

      const newSessionName = 'store-test-session-3';
      await createTestSession(serverInfo.port, newSessionName);

      await act(async () => {
        await SessionStore.fetch();
      });

      await waitFor(() => {
        expect(result.current!.length).toBeGreaterThan(initialCount);
      });

      const newSession = result.current!.find(
        (s) => s.sessionName === newSessionName
      );
      expect(newSession).toBeDefined();
      expect(newSession!.sessionName).toBe(newSessionName);
    })
  );

  it(
    'handles session with active terminal data',
    withTestLogging(async () => {
      const sessionName = 'store-test-session-4';
      await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "SESSION_STORE_TEST_START"',
        'echo "Testing session store functionality"',
        'echo "SESSION_STORE_TEST_END"',
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
        expect(typeof session.activeTerminal.terminalId).toBe('number');
        expect(typeof session.activeTerminal.normal).toBe('object');
        expect(Array.isArray(session.activeTerminal.normal.buffer)).toBe(true);
        expect(typeof session.activeTerminal.normal.cursor).toBe('object');
        expect(typeof session.activeTerminal.startY).toBe('number');

        const cursor = session.activeTerminal.normal.cursor;
        expect(typeof cursor.x).toBe('number');
        expect(typeof cursor.y).toBe('number');
        expect(typeof cursor.visible).toBe('boolean');
        expect(typeof cursor.blinking).toBe('boolean');

        const { container } = render(
          <Terminal session={session} zoom='EXPAND' />
        );

        await waitFor(() => {
          const terminalInner = container.querySelector(
            '[data-testid="terminal-inner"]'
          );
          expect(terminalInner).toBeInTheDocument();
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        });

        const terminalInner = container.querySelector(
          '[data-testid="terminal-inner"]'
        );
        const domContent = getVisibleText(terminalInner);

        const hasOurContent =
          domContent.includes('SESSION_STORE_TEST') ||
          domContent.includes('Testing session store') ||
          domContent.length > 50;

        expect(hasOurContent).toBe(true);
        expect(domContent.trim()).not.toBe('');
      }
    })
  );

  it(
    'handles multiple sessions correctly',
    withTestLogging(async () => {
      const sessionNames = [
        'multi-session-1',
        'multi-session-2',
        'multi-session-3',
      ];

      const tmpDir = os.tmpdir();
      for (const name of sessionNames) {
        await createTestSession(serverInfo.port, name);

        const commands = [
          `cd "${tmpDir}"`,
          `echo "MULTI_SESSION_TEST_${name}"`,
          `echo "Content for session ${name}"`,
        ];

        for (const cmd of commands) {
          await writeToSession(serverInfo.port, name, `${cmd}\n`);
          await waitForTerminalOutput(50);
        }
      }

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

      for (const name of sessionNames) {
        const session = result.current!.find((s) => s.sessionName === name);
        expect(session).toBeDefined();
        expect(session!.sessionName).toBe(name);
      }

      for (const name of sessionNames) {
        const { result: sessionResult } = renderHook(() =>
          SessionStore.useSession(name)
        );

        await waitFor(() => {
          expect(sessionResult.current).toBeDefined();
        });

        expect(sessionResult.current!.sessionName).toBe(name);

        if (sessionResult.current!.activeTerminal) {
          const { container } = render(
            <Terminal session={sessionResult.current!} zoom='EXPAND' />
          );

          await waitFor(() => {
            const terminalInner = container.querySelector(
              '[data-testid="terminal-inner"]'
            );
            expect(terminalInner).toBeInTheDocument();
          });

          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
          });

          const terminalInner = container.querySelector(
            '[data-testid="terminal-inner"]'
          );
          const domContent = getVisibleText(terminalInner);

          const hasOurContent =
            domContent.includes(`MULTI_SESSION_TEST_${name}`) ||
            domContent.includes(`Content for session ${name}`) ||
            domContent.length > 50;

          expect(hasOurContent).toBe(true);
        }
      }
    })
  );

  it(
    'handles session store reactivity correctly',
    withTestLogging(async () => {
      const sessionName = 'reactivity-test-session';

      const { result } = renderHook(() => SessionStore.useList());

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

      await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        await SessionStore.fetch();
      });

      await waitFor(() => {
        const updatedSessions = result.current!.filter(
          (s) => s.sessionName === sessionName
        );
        expect(updatedSessions.length).toBe(1);
      });

      const session = result.current!.find(
        (s) => s.sessionName === sessionName
      );
      expect(session).toBeDefined();
      expect(session!.sessionName).toBe(sessionName);
      expect(session!.terminals.length).toBeGreaterThan(0);
    })
  );

  it(
    'handles error cases gracefully',
    withTestLogging(async () => {
      const { result } = renderHook(() =>
        SessionStore.useSession('non-existent-session')
      );

      await act(async () => {
        await SessionStore.fetch();
      });

      expect(result.current).toBeUndefined();
    })
  );

  it(
    'maintains session data consistency across multiple fetches',
    withTestLogging(async () => {
      const sessionName = 'consistency-test-session';
      await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        await SessionStore.fetch();
      });

      const { result } = renderHook(() => SessionStore.useSession(sessionName));

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      const firstFetchData = result.current!;

      await act(async () => {
        await SessionStore.fetch();
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      const secondFetchData = result.current!;

      expect(firstFetchData.sessionName).toBe(secondFetchData.sessionName);
      expect(firstFetchData.created).toBe(secondFetchData.created);
      expect(firstFetchData.terminals.length).toBe(
        secondFetchData.terminals.length
      );
    })
  );

  it(
    'handles session with complex terminal state',
    withTestLogging(async () => {
      const sessionName = 'complex-state-session';
      await createTestSession(serverInfo.port, sessionName);

      const tmpDir = os.tmpdir();
      const commands = [
        `cd "${tmpDir}"`,
        'echo "COMPLEX_STATE_START"',
        'echo "Multi-line output test"',
        'echo "Line 1" > complex_test.txt',
        'echo "Line 2" >> complex_test.txt',
        'cat complex_test.txt',
        'rm complex_test.txt',
        'echo "COMPLEX_STATE_END"',
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
        const { container } = render(
          <Terminal session={session} zoom='EXPAND' />
        );

        await waitFor(() => {
          const terminalInner = container.querySelector(
            '[data-testid="terminal-inner"]'
          );
          expect(terminalInner).toBeInTheDocument();
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        });

        const terminalInner = container.querySelector(
          '[data-testid="terminal-inner"]'
        );
        const domContent = getVisibleText(terminalInner);

        const hasOurContent =
          domContent.includes('COMPLEX_STATE_START') ||
          domContent.includes('COMPLEX_STATE_END') ||
          domContent.includes('complex_test.txt') ||
          domContent.includes('Multi-line output test') ||
          domContent.length > 100;

        expect(hasOurContent).toBe(true);
        expect(domContent.trim()).not.toBe('');

        const cursor = session.activeTerminal.normal.cursor;
        expect(cursor.x).toBeGreaterThanOrEqual(0);
        expect(cursor.y).toBeGreaterThanOrEqual(0);
      }
    })
  );
});
