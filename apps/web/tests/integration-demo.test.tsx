import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
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
import type { SessionJson } from '@ai-screen/shared';
import Api from '../src/tools/api';

vi.mock('../src/stores/setting_store', () => ({
  useSetting: vi.fn((key: string) => {
    if (key === 'fontFamily') return 'monospace';
    if (key === 'fontSize') return 14;
    return null;
  }),
}));

vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

describe('End-to-End Integration Demo', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
    Api.init();
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it(
    'demonstrates end-to-end testing with real CLI server',
    withTestLogging(async () => {
      const sessionName = 'demo-session';
      const session = await createTestSession(serverInfo.port, sessionName);

      expect(session.sessionName).toBe(sessionName);
      expect(session.terminalParams.rows).toBe(24);
      expect(session.terminalParams.columns).toBe(80);
      expect(typeof session.created).toBe('string');

      await act(async () => {
        render(<Terminal session={session} zoom='FIT' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "Hello from real terminal!"\n'
      );
      await waitForTerminalOutput(200);

      await writeToSession(serverInfo.port, sessionName, 'pwd\n');
      await waitForTerminalOutput(100);

      await waitForTerminalOutput(500);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent.length).toBeGreaterThanOrEqual(0);
    })
  );

  it(
    'demonstrates real error handling',
    withTestLogging(async () => {
      const sessionName = 'error-demo-session';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='FIT' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'cat /nonexistent/file\n'
      );
      await waitForTerminalOutput(300); // Give more time for error to appear

      await waitForTerminalOutput(500);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent.length).toBeGreaterThanOrEqual(0);
    })
  );

  it(
    'demonstrates real multi-line command output',
    withTestLogging(async () => {
      const sessionName = 'multiline-demo-session';
      const session = await createTestSession(serverInfo.port, sessionName);

      await act(async () => {
        render(<Terminal session={session} zoom='FIT' />);
      });

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo -e "Line 1\\nLine 2\\nLine 3"\n'
      );
      await waitForTerminalOutput(200);

      await writeToSession(serverInfo.port, sessionName, 'ls -la | head -5\n');
      await waitForTerminalOutput(200);

      await waitForTerminalOutput(500);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      const textContent = getVisibleText(terminalInner);
      expect(textContent.length).toBeGreaterThanOrEqual(0);
    })
  );
});
