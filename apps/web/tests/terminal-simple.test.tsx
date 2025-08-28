import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import Terminal from '../src/components/terminal';
import Api from '../src/tools/api';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  getTerminalState,
  waitForTerminalOutput,
  getServerInfo,
  getVisibleText,
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock the measurement tools
vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

// Mock the component size hook
vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

// Mock the setting store
vi.mock('../src/stores/setting_store', () => ({
  useSetting: vi.fn((key: string) => {
    if (key === 'fontFamily') return 'monospace';
    if (key === 'fontSize') return 14;
    return null;
  }),
}));

describe('Terminal Component - Simple Tests with Real Data', () => {
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
  });

  it('renders terminal component with real session data', async () => {
    const sessionName = 'simple-test-session-1';
    const session = await createTestSession(serverInfo.port, sessionName);

    await act(async () => {
      render(<Terminal session={session} zoom='EXPAND' />);
    });
    await writeToSession(serverInfo.port, sessionName, 'echo "Simple Test"\n');
    await waitForTerminalOutput(300);

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    const terminal = await getTerminalState(serverInfo.port, sessionName);
    console.log('terminal:', terminal);

    const textContent = getVisibleText(terminalInner);
    console.log('textContent:', textContent);
    expect(textContent.length).toBeGreaterThan(0);
  });

  it('displays terminal content from real server session', async () => {
    const sessionName = 'simple-test-session-3';
    const session = await createTestSession(serverInfo.port, sessionName);
    await act(async () => {
      render(<Terminal session={session} zoom='EXPAND' />);
    });
    await waitForTerminalOutput(300);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "Real terminal test"\n'
    );
    await waitForTerminalOutput(300);

    await writeToSession(serverInfo.port, sessionName, 'pwd\n');
    await waitForTerminalOutput(200);

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
    const textContent = getVisibleText(terminalInner);
    console.log(textContent);
    expect(textContent).toContain('echo "Real terminal test"');
    expect(textContent).toContain('Real terminal test');
    expect(textContent).toContain('pwd');
  });

  it('handles different zoom modes with real session data', async () => {
    const sessionName = 'simple-test-session-4';
    const session = await createTestSession(serverInfo.port, sessionName);

    const zoomModes: Array<'SHRINK' | 'EXPAND' | 'FIT'> = [
      'SHRINK',
      'EXPAND',
      'FIT',
    ];

    for (const zoom of zoomModes) {
      const { unmount } = render(<Terminal session={session} zoom={zoom} />);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      unmount();
    }
  });

  it('handles real terminal state with cursor information', async () => {
    const sessionName = 'simple-test-session-6';
    const session = await createTestSession(serverInfo.port, sessionName);
    await act(async () => {
      render(<Terminal session={session} zoom='EXPAND' />);
    });
    await waitForTerminalOutput(100);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo -n "Cursor position test"'
    );
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    // Verify real cursor data
    expect(sessionWithRealData.activeTerminal!.normal.cursor).toBeDefined();
    const cursor = sessionWithRealData.activeTerminal!.normal.cursor;

    expect(typeof cursor.x).toBe('number');
    expect(typeof cursor.y).toBe('number');
    expect(typeof cursor.visible).toBe('boolean');
    expect(typeof cursor.blinking).toBe('boolean');
    expect(cursor.x).toBeGreaterThanOrEqual(0);
    expect(cursor.y).toBeGreaterThanOrEqual(0);
  });

  it('processes real with multiple lines', async () => {
    const sessionName = 'simple-test-session-7';
    const session = await createTestSession(serverInfo.port, sessionName);
    await act(async () => {
      render(<Terminal session={session} zoom='EXPAND' />);
    });
    await waitForTerminalOutput(100);

    const commands = [
      'echo "Line 1"',
      'echo "Line 2"',
      'echo "Line 3"',
      'ls -la | head -5',
    ];

    for (const cmd of commands) {
      await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
      await waitForTerminalOutput(100);
    }

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
    const textContent = getVisibleText(terminalInner);

    expect(textContent.includes('Line 1')).toBe(true);
    expect(textContent.includes('Line 2')).toBe(true);
    expect(textContent.includes('Line 3')).toBe(true);
  });

  it('handles real session with error output', async () => {
    const sessionName = 'simple-test-session-8';
    const session = await createTestSession(serverInfo.port, sessionName);
    await act(async () => {
      render(<Terminal session={session} zoom='EXPAND' />);
    });
    await waitForTerminalOutput(300);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'cat /nonexistent/file\n'
    );
    await waitForTerminalOutput(300);

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
    const textContent = getVisibleText(terminalInner);
    expect(textContent.includes('nonexistent')).toBe(true);
  });

  it('maintains session structure integrity with real data', async () => {
    const sessionName = 'simple-test-session-9';
    const session = await createTestSession(serverInfo.port, sessionName);

    await act(async () => {
      render(<Terminal session={session} zoom='FIT' />);
    });

    // Verify session structure matches expected format
    expect(session.sessionName).toBe(sessionName);
    expect(typeof session.created).toBe('string');
    expect(Array.isArray(session.clients)).toBe(true);
    expect(Array.isArray(session.terminals)).toBe(true);
    expect(typeof session.terminalParams).toBe('object');
    expect(session.terminalParams.rows).toBeGreaterThan(0);
    expect(session.terminalParams.columns).toBeGreaterThan(0);
    expect(session.terminals.length).toBeGreaterThan(0);
  });

  it('handles session updates with changing terminal state', async () => {
    const sessionName = 'simple-test-session-10';
    const session = await createTestSession(serverInfo.port, sessionName);
    render(<Terminal session={session} zoom='FIT' />);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "State change test"\n'
    );
    await waitForTerminalOutput(100);

    // Get updated state
    const updatedTerminalState = await getTerminalState(
      serverInfo.port,
      sessionName
    );
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: updatedTerminalState,
    };
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
  });
});
