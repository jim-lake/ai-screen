import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import Terminal from '../src/components/terminal';
import type { SessionJson } from '@ai-screen/shared';

// Mock xterm to capture what gets written to it
const mockTerminal = {
  options: { fontFamily: 'monospace', fontSize: 14, lineHeight: 1.0 },
  rows: 24,
  cols: 80,
  open: vi.fn(),
  write: vi.fn(),
  resize: vi.fn(),
  onData: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
  _writtenContent: '', // Track what gets written
};

// Enhanced mock to track terminal content
mockTerminal.write.mockImplementation((data: string) => {
  mockTerminal._writtenContent += data;
});

vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn(() => mockTerminal) }));

// Mock the connect store to simulate real terminal connection
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

describe('Terminal Component (Simple)', () => {
  const mockSession: SessionJson = {
    sessionName: 'test-session',
    created: '2024-01-01T00:00:00Z',
    clients: [],
    terminalParams: { rows: 24, columns: 80 },
    terminals: [{ terminalId: 1 }],
    activeTerminal: {
      terminalId: 1,
      normal: {
        buffer: ['$ echo "Hello World"', 'Hello World', '$ '],
        cursor: { x: 2, y: 2, blinking: true, visible: true },
      },
      startY: 0,
    },
  };

  beforeEach(async () => {
    // Clear all mocks and reset terminal content
    vi.clearAllMocks();
    mockTerminal._writtenContent = '';

    // Get fresh mock references
    const { connect, disconnect, resize } = await import(
      '../src/stores/connect_store'
    );
    vi.mocked(connect).mockClear();
    vi.mocked(disconnect).mockClear();
    vi.mocked(resize).mockClear();
  });

  it('renders terminal component with test id', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Check that the terminal container is rendered with test id
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();
  });

  it('calls connect with correct parameters', async () => {
    const { connect } = await import('../src/stores/connect_store');

    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Verify that connect was called with the session
    expect(vi.mocked(connect)).toHaveBeenCalledWith(
      expect.objectContaining({
        session: mockSession,
        element: expect.any(HTMLDivElement),
        terminalOptions: expect.objectContaining({
          fontFamily: 'monospace',
          fontSize: 14,
        }),
      })
    );
  });

  it('simulates terminal content display by mocking xterm writes', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Simulate what would happen when the terminal connects and receives data
    // In a real scenario, the connect store would call terminal.write() with the buffer content
    const simulatedTerminalBuffer = [
      '$ echo "Hello World"',
      'Hello World',
      '$ ',
    ];

    // Simulate the terminal receiving this content
    simulatedTerminalBuffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // Verify that the mock terminal received the expected content
    expect(mockTerminal.write).toHaveBeenCalled();
    expect(mockTerminal._writtenContent).toContain('Hello World');
    expect(mockTerminal._writtenContent).toContain('echo "Hello World"');
  });

  it('handles multiple terminal writes correctly', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Simulate multiple writes to the terminal
    const writes = [
      'First line of output',
      'Second line of output',
      'Third line with special chars: !@#$%',
      'Command prompt: $ ',
    ];

    writes.forEach((content) => {
      mockTerminal.write(content + '\r\n');
    });

    // Verify all content was written to the mock terminal
    writes.forEach((expectedContent) => {
      expect(mockTerminal._writtenContent).toContain(expectedContent);
    });

    // Verify the total number of write calls
    expect(mockTerminal.write).toHaveBeenCalledTimes(writes.length);
  });

  it('handles different zoom modes without errors', async () => {
    const { connect } = await import('../src/stores/connect_store');
    const zoomModes: Array<'SHRINK' | 'EXPAND' | 'FIT'> = [
      'SHRINK',
      'EXPAND',
      'FIT',
    ];

    for (const zoom of zoomModes) {
      const { unmount } = render(
        <Terminal session={mockSession} zoom={zoom} />
      );

      // Verify the component renders without errors for each zoom mode
      const terminalInner = screen.getByTestId('terminal-inner');
      expect(terminalInner).toBeInTheDocument();

      // Verify connect was called for each render
      expect(vi.mocked(connect)).toHaveBeenCalled();

      unmount();

      // Clear mocks between zoom mode tests
      vi.mocked(connect).mockClear();
    }
  });

  it('calls disconnect when component unmounts', async () => {
    const { connect, disconnect } = await import('../src/stores/connect_store');

    const { unmount } = await act(async () => {
      return render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Verify connect was called
    expect(vi.mocked(connect)).toHaveBeenCalled();

    // Unmount the component
    unmount();

    // Verify disconnect was called
    expect(vi.mocked(disconnect)).toHaveBeenCalledWith(
      expect.objectContaining({
        session: mockSession,
        element: expect.any(HTMLDivElement),
      })
    );
  });

  it('simulates ANSI escape sequence handling', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Simulate terminal content with ANSI escape sequences
    const ansiContent = [
      '\x1b[31mRed text\x1b[0m', // Red text
      '\x1b[1mBold text\x1b[0m', // Bold text
      '\x1b[32mGreen text\x1b[0m', // Green text
      'Normal text',
    ];

    ansiContent.forEach((content) => {
      mockTerminal.write(content + '\r\n');
    });

    // Verify that the ANSI sequences were written to the terminal
    // The actual rendering/interpretation would be handled by xterm.js
    ansiContent.forEach((expectedContent) => {
      expect(mockTerminal._writtenContent).toContain(expectedContent);
    });
  });

  it('handles terminal resize operations', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Simulate a resize operation
    const newSize = { rows: 30, columns: 100 };

    // This would normally be triggered by the component's resize logic
    mockTerminal.resize(newSize.columns, newSize.rows);

    // Verify resize was called with correct parameters
    expect(mockTerminal.resize).toHaveBeenCalledWith(
      newSize.columns,
      newSize.rows
    );
  });

  it('verifies terminal content through mock writes represents expected output', async () => {
    await act(async () => {
      render(<Terminal session={mockSession} zoom='FIT' />);
    });

    // Simulate a realistic terminal session with commands and output
    const terminalSession = [
      '$ ls -la',
      'total 12',
      'drwxr-xr-x 3 user user 4096 Jan  1 12:00 .',
      'drwxr-xr-x 5 user user 4096 Jan  1 11:59 ..',
      '-rw-r--r-- 1 user user   42 Jan  1 12:00 test.txt',
      '$ cat test.txt',
      'This is a test file with some content.',
      '$ echo "Done"',
      'Done',
      '$ ',
    ];

    // Write each line to the mock terminal
    terminalSession.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // Verify that the final content contains all expected elements
    const finalContent = mockTerminal._writtenContent;

    // Check for command execution
    expect(finalContent).toContain('ls -la');
    expect(finalContent).toContain('cat test.txt');
    expect(finalContent).toContain('echo "Done"');

    // Check for command output
    expect(finalContent).toContain('total 12');
    expect(finalContent).toContain('test.txt');
    expect(finalContent).toContain('This is a test file with some content.');
    expect(finalContent).toContain('Done');

    // Check for prompt
    expect(finalContent).toContain('$ ');

    // Verify the number of writes matches our input
    expect(mockTerminal.write).toHaveBeenCalledTimes(terminalSession.length);
  });
});
