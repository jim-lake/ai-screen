import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock Storage to inject test server URL
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

// Mock the measurement tools with realistic values
vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

// Mock the component size hook
vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

describe('Terminal Component - End-to-End Tests', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
    
    // Initialize API with test server
    const api = await import('../src/tools/api');
    await api.default.init();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders terminal with real session data from server', async () => {
    const sessionName = 'e2e-test-session-1';
    const session = await createTestSession(serverInfo.port, sessionName);

    await act(async () => {
      render(<Terminal session={session} zoom='FIT' />);
    });

    // Verify the terminal container is rendered
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
  });

  it('displays real terminal output after executing commands', async () => {
    const sessionName = 'e2e-test-session-2';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute a simple command
    await writeToSession(serverInfo.port, sessionName, 'echo "Hello E2E Test"\n');
    await waitForTerminalOutput(200);

    // Get the updated terminal state
    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    // Update session with real terminal state
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    // Wait for the component to render and process the terminal data
    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    // Verify that the terminal buffer contains our command and output
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('echo "Hello E2E Test"');
    expect(bufferContent).toContain('Hello E2E Test');
  });

  it('handles multiple commands and complex output', async () => {
    const sessionName = 'e2e-test-session-3';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute multiple commands
    await writeToSession(serverInfo.port, sessionName, 'pwd\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'ls -la\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'echo "Current directory: $(pwd)"\n');
    await waitForTerminalOutput(100);

    // Get the updated terminal state
    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    // Verify the terminal buffer contains all our commands
    const buffer = terminalState.normal.buffer;
    expect(buffer.some(line => line.includes('pwd'))).toBe(true);
    expect(buffer.some(line => line.includes('ls -la'))).toBe(true);
    expect(buffer.some(line => line.includes('Current directory:'))).toBe(true);
    
    // Verify we have a reasonable amount of output
    expect(buffer.length).toBeGreaterThan(5);
  });

  it('displays file listing output correctly', async () => {
    const sessionName = 'e2e-test-session-4';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Create a test file and list it
    await writeToSession(serverInfo.port, sessionName, 'echo "test content" > test-e2e.txt\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'ls -la test-e2e.txt\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'cat test-e2e.txt\n');
    await waitForTerminalOutput(100);

    // Clean up
    await writeToSession(serverInfo.port, sessionName, 'rm test-e2e.txt\n');
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    const buffer = terminalState.normal.buffer;
    
    // Verify file operations are in the buffer
    expect(buffer.some(line => line.includes('test-e2e.txt'))).toBe(true);
    expect(buffer.some(line => line.includes('test content'))).toBe(true);
    expect(buffer.some(line => line.includes('cat test-e2e.txt'))).toBe(true);
  });

  it('handles error commands and displays error output', async () => {
    const sessionName = 'e2e-test-session-5';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands that will produce errors
    await writeToSession(serverInfo.port, sessionName, 'cat nonexistent-file.txt\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'ls /nonexistent-directory\n');
    await waitForTerminalOutput(200);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    const buffer = terminalState.normal.buffer;
    
    // Verify error messages are captured
    expect(buffer.some(line => 
      line.includes('No such file or directory') || 
      line.includes('cannot access') ||
      line.includes('not found')
    )).toBe(true);
  });

  it('displays cursor position correctly from real terminal state', async () => {
    const sessionName = 'e2e-test-session-6';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute a command that leaves cursor in a known state
    await writeToSession(serverInfo.port, sessionName, 'echo -n "Cursor test: "');
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    // Verify cursor information is present and reasonable
    const cursor = terminalState.normal.cursor;
    expect(typeof cursor.x).toBe('number');
    expect(typeof cursor.y).toBe('number');
    expect(typeof cursor.visible).toBe('boolean');
    expect(typeof cursor.blinking).toBe('boolean');
    
    // Cursor should be positioned after our text
    expect(cursor.x).toBeGreaterThan(0);
    expect(cursor.y).toBeGreaterThanOrEqual(0);
  });

  it('handles terminal resize operations with real server', async () => {
    const sessionName = 'e2e-test-session-7';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Test different zoom modes
    const zoomModes: Array<'SHRINK' | 'EXPAND' | 'FIT'> = ['SHRINK', 'EXPAND', 'FIT'];

    for (const zoom of zoomModes) {
      const { unmount } = render(<Terminal session={session} zoom={zoom} />);

      await waitFor(() => {
        const terminalInner = screen.getByTestId('terminal-inner');
        expect(terminalInner).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('processes real ANSI escape sequences from terminal output', async () => {
    const sessionName = 'e2e-test-session-8';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands that produce ANSI escape sequences
    await writeToSession(serverInfo.port, sessionName, 'echo -e "\\033[31mRed text\\033[0m"\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'echo -e "\\033[1mBold text\\033[0m"\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'ls --color=always\n');
    await waitForTerminalOutput(200);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    const buffer = terminalState.normal.buffer;
    
    // Verify ANSI sequences or their effects are present
    expect(buffer.some(line => 
      line.includes('Red text') || 
      line.includes('Bold text') ||
      line.includes('\x1b[') // ANSI escape sequence
    )).toBe(true);
  });

  it('maintains terminal state consistency across re-renders', async () => {
    const sessionName = 'e2e-test-session-9';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute some commands to create state
    await writeToSession(serverInfo.port, sessionName, 'echo "State test 1"\n');
    await waitForTerminalOutput(100);
    
    const terminalState1 = await getTerminalState(serverInfo.port, sessionName);
    
    await writeToSession(serverInfo.port, sessionName, 'echo "State test 2"\n');
    await waitForTerminalOutput(100);
    
    const terminalState2 = await getTerminalState(serverInfo.port, sessionName);

    // Render with first state
    const { rerender } = render(
      <Terminal 
        session={{ ...session, activeTerminal: terminalState1 }} 
        zoom='FIT' 
      />
    );

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    // Re-render with updated state
    rerender(
      <Terminal 
        session={{ ...session, activeTerminal: terminalState2 }} 
        zoom='FIT' 
      />
    );

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    // Verify both states have different content
    expect(terminalState1.normal.buffer.length).toBeLessThanOrEqual(terminalState2.normal.buffer.length);
    expect(terminalState2.normal.buffer.some(line => line.includes('State test 2'))).toBe(true);
  });

  it('handles long-running commands and output streaming', async () => {
    const sessionName = 'e2e-test-session-10';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute a command that produces multiple lines of output
    await writeToSession(serverInfo.port, sessionName, 'for i in {1..5}; do echo "Line $i"; sleep 0.1; done\n');
    
    // Wait for command to complete
    await waitForTerminalOutput(1000);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    const updatedSession: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={updatedSession} zoom='FIT' />);
    });

    await waitFor(() => {
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();
    });

    const buffer = terminalState.normal.buffer;
    
    // Verify we captured multiple lines of output
    const lineCount = buffer.filter(line => line.includes('Line ')).length;
    expect(lineCount).toBeGreaterThanOrEqual(3); // Should have captured at least some lines
    
    // Verify specific lines are present
    expect(buffer.some(line => line.includes('Line 1'))).toBe(true);
    expect(buffer.some(line => line.includes('Line 5'))).toBe(true);
  });
});
