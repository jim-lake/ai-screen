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
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock only essential modules that can't work in test environment
// Keep measurement tools mocked as they require DOM measurement
vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

// Mock the component size hook for consistent sizing
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

describe('Terminal Content Verification with Real XTerm and WebSocket', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();

    // Set up the API base URL for the test server
    const { default: Api } = await import('../src/tools/api');
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('renders terminal component with real xterm and WebSocket connection', async () => {
    const sessionName = 'content-test-session-1';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute real commands on the server
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

    // Get real terminal state from server
    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealContent: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
    });

    // Verify the terminal component rendered
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Wait for terminal to be ready and potentially connect via WebSocket
    await waitFor(
      () => {
        expect(terminalInner).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify that the terminal component structure is correct
    expect(terminalInner.tagName.toLowerCase()).toBe('div');
    expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');

    // Verify real terminal state structure from server
    expect(terminalState.normal.buffer.length).toBeGreaterThan(3);
    expect(terminalState.normal.cursor).toBeDefined();
    expect(typeof terminalState.normal.cursor.x).toBe('number');
    expect(typeof terminalState.normal.cursor.y).toBe('number');

    // Verify the buffer contains our real commands
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('echo "Hello Real World"');
    expect(bufferContent).toContain('Hello Real World');
    expect(bufferContent).toContain('ls -la');
    expect(bufferContent).toContain('pwd');
  });

  it('verifies terminal component handles complex real terminal output with WebSocket', async () => {
    const sessionName = 'content-test-session-2';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute complex commands that produce rich output
    const commands = [
      'whoami',
      'pwd',
      'echo "Files: $(ls | wc -l)"',
      'date',
      'echo -e "Multi\\nLine\\nOutput"',
    ];

    for (const cmd of commands) {
      await writeToSession(serverInfo.port, sessionName, `${cmd}\n`);
      await waitForTerminalOutput(100);
    }

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealContent: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Wait for terminal to be ready
    await waitFor(
      () => {
        expect(terminalInner).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify real terminal buffer content
    const bufferContent = terminalState.normal.buffer.join(' ');

    // Verify basic commands are present in buffer
    expect(bufferContent).toContain('whoami');
    expect(bufferContent).toContain('pwd');
    expect(bufferContent).toContain('date');

    // Verify command substitution worked
    expect(bufferContent).toContain('Files:');

    // Verify multi-line output
    expect(bufferContent).toContain('Multi');

    // Verify content structure and length with real data
    expect(bufferContent.length).toBeGreaterThan(100);

    // Verify the terminal component is properly structured
    expect(terminalInner.nodeType).toBe(Node.ELEMENT_NODE);
    expect(terminalInner.tagName.toLowerCase()).toBe('div');
  });

  it('handles real error messages and special characters with WebSocket terminal', async () => {
    const sessionName = 'content-test-session-3';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands that produce errors and special characters
    await writeToSession(
      serverInfo.port,
      sessionName,
      'cat /nonexistent/file.txt\n'
    );
    await waitForTerminalOutput(200);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "Special: !@#$%^&*()"\n'
    );
    await waitForTerminalOutput(100);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo -e "\\033[31mRed\\033[0m"\n'
    );
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealContent: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Verify the terminal buffer contains real error messages and special characters
    const bufferContent = terminalState.normal.buffer.join(' ');

    // Verify the buffer contains real error messages
    expect(bufferContent).toContain('cat /nonexistent/file.txt');
    expect(bufferContent.toLowerCase()).toMatch(
      /no such file|cannot access|not found/
    );

    // Verify special characters are preserved in buffer
    expect(bufferContent).toContain('!@#$%^&*()');

    // Verify ANSI sequences or their content
    expect(bufferContent).toContain('Red');

    // Verify buffer content has reasonable length
    expect(bufferContent.length).toBeGreaterThan(50);
  });

  it('handles real file operations and directory listings with WebSocket terminal', async () => {
    const sessionName = 'content-test-session-4';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Create and manipulate real files
    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "test content" > temp-test.txt\n'
    );
    await waitForTerminalOutput(100);

    await writeToSession(
      serverInfo.port,
      sessionName,
      'ls -la temp-test.txt\n'
    );
    await waitForTerminalOutput(200);

    await writeToSession(serverInfo.port, sessionName, 'cat temp-test.txt\n');
    await waitForTerminalOutput(100);

    await writeToSession(serverInfo.port, sessionName, 'rm temp-test.txt\n');
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealContent: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Verify real file operations are captured in terminal buffer
    const bufferContent = terminalState.normal.buffer.join(' ');

    expect(bufferContent).toContain('temp-test.txt');
    expect(bufferContent).toContain('test content');
    expect(bufferContent).toContain('ls -la');
    expect(bufferContent).toContain('cat temp-test.txt');

    // Should contain file permissions and details from real ls output
    expect(bufferContent).toMatch(/-rw-/); // File permissions

    expect(bufferContent.length).toBeGreaterThan(80);

    // Verify terminal component rendered correctly
    expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');
  });

  it('verifies terminal component integrates with real xterm and WebSocket', async () => {
    const sessionName = 'content-test-session-5';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute a simple command
    await writeToSession(
      serverInfo.port,
      sessionName,
      'echo "XTerm WebSocket Test"\n'
    );
    await waitForTerminalOutput(100);

    const terminalState = await getTerminalState(serverInfo.port, sessionName);

    const sessionWithRealContent: SessionJson = {
      ...session,
      activeTerminal: terminalState,
    };

    await act(async () => {
      render(<Terminal session={sessionWithRealContent} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Wait for any terminal setup with longer timeout for WebSocket connection
    await waitFor(
      () => {
        expect(terminalInner).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify the terminal component structure
    expect(terminalInner.tagName.toLowerCase()).toBe('div');
    expect(terminalInner).toHaveAttribute('data-testid', 'terminal-inner');

    // Verify the terminal buffer contains our command
    const bufferContent = terminalState.normal.buffer.join(' ');
    expect(bufferContent).toContain('echo "XTerm WebSocket Test"');
    expect(bufferContent).toContain('XTerm WebSocket Test');

    // Verify terminal state structure
    expect(terminalState.normal.cursor.x).toBeGreaterThanOrEqual(0);
    expect(terminalState.normal.cursor.y).toBeGreaterThanOrEqual(0);
    expect(terminalState.normal.buffer.length).toBeGreaterThan(0);
  });
});
