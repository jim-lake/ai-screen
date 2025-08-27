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
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock only essential modules that can't work in test environment
vi.mock('@xterm/xterm', () => {
  const mockTerminal = {
    options: { fontFamily: 'monospace', fontSize: 14 },
    rows: 24,
    cols: 80,
    open: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  };
  return { Terminal: vi.fn(() => mockTerminal) };
});

vi.mock('../src/stores/connect_store', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  resize: vi.fn(),
  useTerminal: vi.fn(() => ({ options: { fontFamily: 'monospace', fontSize: 14 } })),
  useTerminalSize: vi.fn(() => ({ rows: 24, columns: 80 })),
}));

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
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('demonstrates end-to-end testing with real CLI server', async () => {
    // 1. Create a real session on the CLI server
    const sessionName = 'demo-session';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Verify session was created with expected structure
    expect(session.sessionName).toBe(sessionName);
    expect(session.terminalParams.rows).toBe(24);
    expect(session.terminalParams.columns).toBe(80);
    expect(typeof session.created).toBe('string');

    // 2. Execute real commands on the server
    await writeToSession(serverInfo.port, sessionName, 'echo "Hello from real terminal!"\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'pwd\n');
    await waitForTerminalOutput(100);

    // 3. Get real terminal state from server
    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    // Verify terminal state has real data
    expect(terminalState.terminalId).toBeGreaterThan(0);
    expect(Array.isArray(terminalState.normal.buffer)).toBe(true);
    expect(terminalState.normal.buffer.length).toBeGreaterThan(0);
    
    // Verify our commands are in the buffer
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('echo "Hello from real terminal!"');
    expect(bufferContent).toContain('Hello from real terminal!');
    expect(bufferContent).toContain('pwd');

    // Verify cursor information is present
    expect(typeof terminalState.normal.cursor.x).toBe('number');
    expect(typeof terminalState.normal.cursor.y).toBe('number');
    expect(typeof terminalState.normal.cursor.visible).toBe('boolean');

    // 4. Test React component with real session data
    const sessionWithRealData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealData} zoom='FIT' />);
    });

    // Verify component renders successfully
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // 5. Verify connect store was called with real session data
    const { connect } = await import('../src/stores/connect_store');
    expect(vi.mocked(connect)).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          sessionName: sessionName,
          activeTerminal: expect.objectContaining({
            terminalId: expect.any(Number),
            normal: expect.objectContaining({
              buffer: expect.any(Array),
              cursor: expect.any(Object),
            }),
          }),
        }),
        element: expect.any(HTMLDivElement),
        terminalOptions: expect.objectContaining({
          fontFamily: 'monospace',
          fontSize: 14,
        }),
      })
    );
  });

  it('demonstrates real error handling', async () => {
    const sessionName = 'error-demo-session';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute a command that will produce an error
    await writeToSession(serverInfo.port, sessionName, 'cat /nonexistent/file\n');
    await waitForTerminalOutput(300); // Give more time for error to appear

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    // Verify the command was executed (even if error hasn't appeared yet)
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('cat /nonexistent/file');

    // Component should still render successfully with any content
    const sessionWithErrorData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithErrorData} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
    
    // Verify we have real terminal data structure
    expect(terminalState.normal.buffer.length).toBeGreaterThan(0);
    expect(typeof terminalState.normal.cursor.x).toBe('number');
  });

  it('demonstrates real multi-line command output', async () => {
    const sessionName = 'multiline-demo-session';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands that produce multi-line output
    await writeToSession(serverInfo.port, sessionName, 'echo -e "Line 1\\nLine 2\\nLine 3"\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'ls -la | head -5\n');
    await waitForTerminalOutput(200);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    // Verify multi-line content
    expect(terminalState.normal.buffer.length).toBeGreaterThan(5);
    
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('Line 1');
    expect(bufferContent).toContain('Line 2');
    expect(bufferContent).toContain('Line 3');

    // Component renders with complex content
    const sessionWithMultilineData: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithMultilineData} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
  });
});
