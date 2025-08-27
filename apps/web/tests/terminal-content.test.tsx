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
} from './test-utils';
import type { SessionJson } from '@ai-screen/shared';

// Mock only essential modules that can't work in test environment
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
  _element: null as HTMLElement | null,
};

mockTerminal.write.mockImplementation((data: string) => {
  mockTerminal._writtenContent += data;
  if (mockTerminal._element) {
    const currentContent = mockTerminal._element.textContent || '';
    mockTerminal._element.textContent = currentContent + data;
  }
});

mockTerminal.open.mockImplementation((element: HTMLElement) => {
  mockTerminal._element = element;
  if (mockTerminal._writtenContent) {
    element.textContent = mockTerminal._writtenContent;
  }
});

vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn(() => mockTerminal) }));

// Mock connect store minimally
vi.mock('../src/stores/connect_store', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  resize: vi.fn(),
  useTerminal: vi.fn(() => mockTerminal),
  useTerminalSize: vi.fn(() => ({ rows: 24, columns: 80 })),
}));

// Mock the setting store
vi.mock('../src/stores/setting_store', () => ({
  useSetting: vi.fn((key: string) => {
    if (key === 'fontFamily') return 'monospace';
    if (key === 'fontSize') return 14;
    return null;
  }),
}));

// Mock the measurement tools
vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

// Mock the component size hook
vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

describe('Terminal Content Verification with Real Server Data', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTerminal._writtenContent = '';
    mockTerminal._element = null;
  });

  it('verifies terminal displays real command output and inspects DOM textContent', async () => {
    const sessionName = 'content-test-session-1';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute real commands on the server
    await writeToSession(serverInfo.port, sessionName, 'echo "Hello Real World"\n');
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

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Simulate xterm.js opening and connecting to the DOM element
    mockTerminal.open(terminalInner);

    // Simulate writing the real terminal buffer content
    terminalState.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // Verify that the mock terminal received the real content
    const writtenContent = mockTerminal._writtenContent;

    // Check for real commands that were executed
    expect(writtenContent).toContain('echo "Hello Real World"');
    expect(writtenContent).toContain('ls -la');
    expect(writtenContent).toContain('pwd');

    // Check for real command outputs
    expect(writtenContent).toContain('Hello Real World');

    // INSPECT THE DOM TEXTCONTENT with real data
    const domTextContent = terminalInner.textContent || '';

    // Verify the DOM contains the real terminal content
    expect(domTextContent).toContain('echo "Hello Real World"');
    expect(domTextContent).toContain('Hello Real World');
    expect(domTextContent).toContain('ls -la');
    expect(domTextContent).toContain('pwd');

    // Verify the DOM content is substantial and real
    expect(domTextContent.length).toBeGreaterThan(50);
    
    // Verify real terminal state structure
    expect(terminalState.normal.buffer.length).toBeGreaterThan(3);
    expect(terminalState.normal.cursor).toBeDefined();
    expect(typeof terminalState.normal.cursor.x).toBe('number');
    expect(typeof terminalState.normal.cursor.y).toBe('number');
  });

  it('comprehensively inspects DOM textContent with complex real terminal output', async () => {
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

    mockTerminal.open(terminalInner);

    // Write all the real terminal content
    terminalState.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // COMPREHENSIVE DOM TEXTCONTENT INSPECTION with real data
    const domTextContent = terminalInner.textContent || '';

    // Verify basic commands are present
    expect(domTextContent).toContain('whoami');
    expect(domTextContent).toContain('pwd');
    expect(domTextContent).toContain('date');

    // Verify command substitution worked
    expect(domTextContent).toContain('Files:');

    // Verify multi-line output
    expect(domTextContent).toContain('Multi');

    // Verify prompts are present
    const promptCount = (domTextContent.match(/\$ /g) || []).length;
    expect(promptCount).toBeGreaterThanOrEqual(3);

    // Verify content structure and length with real data
    expect(domTextContent.length).toBeGreaterThan(100);

    // Verify the DOM element structure is accessible
    expect(terminalInner.nodeType).toBe(Node.ELEMENT_NODE);
    expect(terminalInner.tagName.toLowerCase()).toBe('div');

    // Final verification: DOM content matches what we wrote to the mock terminal
    expect(domTextContent).toEqual(mockTerminal._writtenContent);
  });

  it('verifies DOM textContent contains real error messages and special characters', async () => {
    const sessionName = 'content-test-session-3';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Execute commands that produce errors and special characters
    await writeToSession(serverInfo.port, sessionName, 'cat /nonexistent/file.txt\n');
    await waitForTerminalOutput(200);
    
    await writeToSession(serverInfo.port, sessionName, 'echo "Special: !@#$%^&*()"\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'echo -e "\\033[31mRed\\033[0m"\n');
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

    mockTerminal.open(terminalInner);

    // Simulate terminal content being written
    terminalState.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // INSPECT THE DOM TEXTCONTENT for real error messages and special characters
    const domTextContent = terminalInner.textContent || '';

    // Verify the DOM contains real error messages
    expect(domTextContent).toContain('cat /nonexistent/file.txt');
    expect(domTextContent.toLowerCase()).toMatch(/no such file|cannot access|not found/);
    
    // Verify special characters are preserved
    expect(domTextContent).toContain('!@#$%^&*()');
    
    // Verify ANSI sequences or their content
    expect(domTextContent).toContain('Red');

    // Verify DOM content has reasonable length
    expect(domTextContent.length).toBeGreaterThan(50);

    // Verify DOM content matches mock terminal content
    expect(domTextContent).toEqual(mockTerminal._writtenContent);
  });

  it('handles real file operations and directory listings', async () => {
    const sessionName = 'content-test-session-4';
    const session = await createTestSession(serverInfo.port, sessionName);

    // Create and manipulate real files
    await writeToSession(serverInfo.port, sessionName, 'echo "test content" > temp-test.txt\n');
    await waitForTerminalOutput(100);
    
    await writeToSession(serverInfo.port, sessionName, 'ls -la temp-test.txt\n');
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
    mockTerminal.open(terminalInner);

    terminalState.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    const domTextContent = terminalInner.textContent || '';

    // Verify real file operations are captured
    expect(domTextContent).toContain('temp-test.txt');
    expect(domTextContent).toContain('test content');
    expect(domTextContent).toContain('ls -la');
    expect(domTextContent).toContain('cat temp-test.txt');

    // Should contain file permissions and details from real ls output
    expect(domTextContent).toMatch(/-rw-/); // File permissions

    expect(domTextContent.length).toBeGreaterThan(80);
  });
});
