import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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
  getServerInfo,
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock only essential modules that can't work in test environment
vi.mock('@xterm/xterm', () => {
  const mockTerminal = {
    options: { fontFamily: 'monospace', fontSize: 14, lineHeight: 1.0 },
    rows: 24,
    cols: 80,
    open: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
    _writtenContent: '',
  };

  mockTerminal.write.mockImplementation((data: string) => {
    mockTerminal._writtenContent += data;
  });

  return { Terminal: vi.fn(() => mockTerminal) };
});

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

// Mock connect store to use minimal mocking
vi.mock('../src/stores/connect_store', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  resize: vi.fn(),
  useTerminal: vi.fn(() => {
    const { Terminal } = require('@xterm/xterm');
    return new Terminal();
  }),
  useTerminalSize: vi.fn(() => ({ rows: 24, columns: 80 })),
}));

describe('Terminal Component - Simple Tests with Real Data', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
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
      render(<Terminal session={session} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
  });

  it('calls connect with real session parameters', async () => {
    const sessionName = 'simple-test-session-2';
    const session = await createTestSession(serverInfo.port, sessionName);

    const { connect } = await import('../src/stores/connect_store');

    await act(async () => {
      render(<Terminal session={session} zoom='FIT' />);
    });

    expect(vi.mocked(connect)).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          sessionName: sessionName,
          created: expect.any(String),
          terminals: expect.any(Array),
        }),
        element: expect.any(HTMLDivElement),
        terminalOptions: expect.objectContaining({
          fontFamily: 'monospace',
          fontSize: 14,
        }),
      })
    );
  });

  it('displays terminal content from real server session', async () => {
    const sessionName = 'simple-test-session-3';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands to create real terminal content
    await writeToSession(serverInfo.port, sessionName, 'echo "Real terminal test"\n');
    await waitForTerminalOutput(300);
    
    await writeToSession(serverInfo.port, sessionName, 'pwd\n');
    await waitForTerminalOutput(200);

    // Get the real terminal state
    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealData} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Verify the session has real terminal data
    expect(sessionWithRealData.activeTerminal).toBeDefined();
    
    // Join buffer and check for content (handles ANSI escape sequences)
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('echo "Real terminal test"');
    expect(bufferContent).toContain('Real terminal test');
    expect(bufferContent).toContain('pwd');
  });

  it('handles different zoom modes with real session data', async () => {
    const sessionName = 'simple-test-session-4';
    const session = await createTestSession(serverInfo.port, sessionName);

    const zoomModes: Array<'SHRINK' | 'EXPAND' | 'FIT'> = ['SHRINK', 'EXPAND', 'FIT'];

    for (const zoom of zoomModes) {
      const { unmount } = render(<Terminal session={session} zoom={zoom} />);

      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      unmount();
    }
  });

  it('calls disconnect when component unmounts with real session', async () => {
    const sessionName = 'simple-test-session-5';
    const session = await createTestSession(serverInfo.port, sessionName);

    const { connect, disconnect } = await import('../src/stores/connect_store');

    const { unmount } = await act(async () => {
      return render(<Terminal session={session} zoom='FIT' />);
    });

    expect(vi.mocked(connect)).toHaveBeenCalled();

    unmount();

    expect(vi.mocked(disconnect)).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          sessionName: sessionName,
        }),
        element: expect.any(HTMLDivElement),
      })
    );
  });

  it('handles real terminal state with cursor information', async () => {
    const sessionName = 'simple-test-session-6';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute command that positions cursor
    await writeToSession(serverInfo.port, sessionName, 'echo -n "Cursor position test"');
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealData} zoom='FIT' />);
    });

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

  it('processes real terminal buffer with multiple lines', async () => {
    const sessionName = 'simple-test-session-7';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Create multi-line output
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

    await act(async () => {
      render(<Terminal session={sessionWithRealData} zoom='FIT' />);
    });

    const buffer = sessionWithRealData.activeTerminal!.normal.buffer;
    
    // Verify we have substantial content
    expect(buffer.length).toBeGreaterThan(5);
    
    // Verify specific content
    expect(buffer.some(line => line.includes('Line 1'))).toBe(true);
    expect(buffer.some(line => line.includes('Line 2'))).toBe(true);
    expect(buffer.some(line => line.includes('Line 3'))).toBe(true);
  });

  it('handles real session with error output', async () => {
    const sessionName = 'simple-test-session-8';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute command that produces error
    await writeToSession(serverInfo.port, sessionName, 'cat /nonexistent/file\n');
    await waitForTerminalOutput(300);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealData} zoom='FIT' />);
    });

    const buffer = sessionWithRealData.activeTerminal!.normal.buffer;
    const bufferContent = buffer.join(' ');
    
    // Should contain the command that was executed
    expect(bufferContent).toContain('cat /nonexistent/file');
    
    // Verify we have real terminal data structure
    expect(buffer.length).toBeGreaterThan(0);
    expect(typeof terminalState.normal.cursor.x).toBe('number');
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

    // Initial render
    const { rerender } = render(<Terminal session={session} zoom='FIT' />);

    // Execute command to change state
    await writeToSession(serverInfo.port, sessionName, 'echo "State change test"\n');
    await waitForTerminalOutput(100);

    // Get updated state
    const updatedTerminalState = await getTerminalState(serverInfo.port, sessionName);
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: updatedTerminalState,
    };

    // Re-render with updated session
    rerender(<Terminal session={updatedSession} zoom='FIT' />);

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Verify updated state contains new content
    expect(updatedSession.activeTerminal!.normal.buffer.some(line => 
      line.includes('State change test')
    )).toBe(true);
  });
});
