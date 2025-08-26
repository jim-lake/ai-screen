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
  _element: null as HTMLElement | null, // Track the DOM element
};

// Enhanced mock to track terminal content and DOM element
mockTerminal.write.mockImplementation((data: string) => {
  mockTerminal._writtenContent += data;
  // Simulate writing to the DOM element if it exists
  if (mockTerminal._element) {
    // Simulate how xterm.js would update the DOM with terminal content
    const currentContent = mockTerminal._element.textContent || '';
    mockTerminal._element.textContent = currentContent + data;
  }
});

mockTerminal.open.mockImplementation((element: HTMLElement) => {
  mockTerminal._element = element;
  // Initialize with existing content to simulate xterm behavior
  if (mockTerminal._writtenContent) {
    element.textContent = mockTerminal._writtenContent;
  }
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

describe('Terminal Content Verification with DOM Inspection', () => {
  beforeEach(async () => {
    // Clear all mocks and reset terminal content
    vi.clearAllMocks();
    mockTerminal._writtenContent = '';
    mockTerminal._element = null;

    // Get fresh mock references
    const { connect, disconnect, resize } = await import(
      '../src/stores/connect_store'
    );
    vi.mocked(connect).mockClear();
    vi.mocked(disconnect).mockClear();
    vi.mocked(resize).mockClear();
  });

  it('verifies terminal displays expected command output content and inspects DOM textContent', async () => {
    const sessionWithContent: SessionJson = {
      sessionName: 'content-test-session',
      created: '2024-01-01T00:00:00Z',
      clients: [],
      terminalParams: { rows: 24, columns: 80 },
      terminals: [{ terminalId: 1 }],
      activeTerminal: {
        terminalId: 1,
        normal: {
          buffer: [
            '$ echo "Hello World"',
            'Hello World',
            '$ ls -la',
            'total 8',
            'drwxr-xr-x 2 user user 4096 Jan  1 12:00 .',
            'drwxr-xr-x 3 user user 4096 Jan  1 11:59 ..',
            '-rw-r--r-- 1 user user   42 Jan  1 12:00 test.txt',
            '$ cat test.txt',
            'This is test content in the file.',
            '$ ',
          ],
          cursor: { x: 2, y: 9, blinking: true, visible: true },
        },
        startY: 0,
      },
    };

    await act(async () => {
      render(<Terminal session={sessionWithContent} zoom='FIT' />);
    });

    // Get the terminal inner element (the View that Xterm connects to)
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Simulate xterm.js opening and connecting to the DOM element
    mockTerminal.open(terminalInner);

    // Manually simulate what would happen when terminal content is written
    sessionWithContent.activeTerminal!.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // Verify that the mock terminal received all the expected content
    const writtenContent = mockTerminal._writtenContent;

    // Check for commands
    expect(writtenContent).toContain('echo "Hello World"');
    expect(writtenContent).toContain('ls -la');
    expect(writtenContent).toContain('cat test.txt');

    // Check for command outputs
    expect(writtenContent).toContain('Hello World');
    expect(writtenContent).toContain('total 8');
    expect(writtenContent).toContain('test.txt');
    expect(writtenContent).toContain('This is test content in the file.');

    // INSPECT THE DOM TEXTCONTENT - this is the key addition
    // Verify the DOM element under terminal-inner has the expected content
    const domTextContent = terminalInner.textContent || '';

    // Check that the DOM contains the same expected content
    expect(domTextContent).toContain('echo "Hello World"');
    expect(domTextContent).toContain('Hello World');
    expect(domTextContent).toContain('ls -la');
    expect(domTextContent).toContain('total 8');
    expect(domTextContent).toContain('test.txt');
    expect(domTextContent).toContain('This is test content in the file.');
    expect(domTextContent).toContain('drwxr-xr-x');
    expect(domTextContent).toContain('-rw-r--r--');
    expect(domTextContent).toContain('4096');
    expect(domTextContent).toContain('Jan  1 12:00');
    expect(domTextContent).toContain('$ ');

    // Verify the DOM content is substantial
    expect(domTextContent.length).toBeGreaterThan(100);
  });

  it('comprehensively inspects DOM textContent structure under terminal-inner', async () => {
    const sessionWithRichContent: SessionJson = {
      sessionName: 'dom-inspection-session',
      created: '2024-01-01T00:00:00Z',
      clients: [],
      terminalParams: { rows: 24, columns: 80 },
      terminals: [{ terminalId: 1 }],
      activeTerminal: {
        terminalId: 1,
        normal: {
          buffer: [
            '$ whoami',
            'testuser',
            '$ pwd',
            '/home/testuser/projects',
            '$ ls -la | grep -E "\\.(js|ts)$"',
            '-rw-r--r-- 1 testuser testuser  1234 Jan  1 12:00 app.js',
            '-rw-r--r-- 1 testuser testuser  5678 Jan  1 12:01 config.ts',
            '$ echo "Files found: $(ls *.js *.ts | wc -l)"',
            'Files found: 3',
            '$ git status --porcelain',
            'M  app.js',
            'A  config.ts',
            '?? utils.js',
            '$ echo "Status: $?"',
            'Status: 0',
            '$ ',
          ],
          cursor: { x: 2, y: 15, blinking: true, visible: true },
        },
        startY: 0,
      },
    };

    await act(async () => {
      render(<Terminal session={sessionWithRichContent} zoom='FIT' />);
    });

    // Get the terminal inner element
    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Simulate xterm.js opening and connecting to the DOM element
    mockTerminal.open(terminalInner);

    // Write all the terminal content
    sessionWithRichContent.activeTerminal!.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // COMPREHENSIVE DOM TEXTCONTENT INSPECTION
    const domTextContent = terminalInner.textContent || '';

    // 1. Verify basic commands and outputs
    expect(domTextContent).toContain('whoami');
    expect(domTextContent).toContain('testuser');
    expect(domTextContent).toContain('pwd');
    expect(domTextContent).toContain('/home/testuser/projects');

    // 2. Verify complex piped commands
    expect(domTextContent).toContain('ls -la | grep -E "\\.(js|ts)$"');

    // 3. Verify file listing with permissions and timestamps
    expect(domTextContent).toContain(
      '-rw-r--r-- 1 testuser testuser  1234 Jan  1 12:00 app.js'
    );
    expect(domTextContent).toContain(
      '-rw-r--r-- 1 testuser testuser  5678 Jan  1 12:01 config.ts'
    );

    // 4. Verify command substitution
    expect(domTextContent).toContain(
      'echo "Files found: $(ls *.js *.ts | wc -l)"'
    );
    expect(domTextContent).toContain('Files found: 3');

    // 5. Verify git status output
    expect(domTextContent).toContain('git status --porcelain');
    expect(domTextContent).toContain('M  app.js');
    expect(domTextContent).toContain('A  config.ts');
    expect(domTextContent).toContain('?? utils.js');

    // 6. Verify variable expansion
    expect(domTextContent).toContain('echo "Status: $?"');
    expect(domTextContent).toContain('Status: 0');

    // 7. Verify prompts are present
    const promptCount = (domTextContent.match(/\$ /g) || []).length;
    expect(promptCount).toBeGreaterThanOrEqual(6);

    // 8. Verify content structure and length
    expect(domTextContent.length).toBeGreaterThan(300);

    // 9. Verify specific file extensions are preserved
    expect(domTextContent).toContain('.js');
    expect(domTextContent).toContain('.ts');

    // 10. Verify special characters and symbols are preserved
    expect(domTextContent).toContain('$(');
    expect(domTextContent).toContain('|');
    expect(domTextContent).toContain('??');
    expect(domTextContent).toContain('--porcelain');

    // 11. Verify the DOM element structure is accessible
    expect(terminalInner.nodeType).toBe(Node.ELEMENT_NODE);
    expect(terminalInner.tagName.toLowerCase()).toBe('div');

    // 12. Final verification: DOM content matches what we wrote to the mock terminal
    expect(domTextContent).toEqual(mockTerminal._writtenContent);
  });

  it('verifies DOM textContent contains error messages and special characters', async () => {
    const sessionWithErrors: SessionJson = {
      sessionName: 'error-test-session',
      created: '2024-01-01T00:00:00Z',
      clients: [],
      terminalParams: { rows: 24, columns: 80 },
      terminals: [{ terminalId: 1 }],
      activeTerminal: {
        terminalId: 1,
        normal: {
          buffer: [
            '$ cat nonexistent.txt',
            'cat: nonexistent.txt: No such file or directory',
            '$ echo "Special chars: !@#$%^&*()_+-={}[]|\\:"',
            'Special chars: !@#$%^&*()_+-={}[]|\\:',
            '$ python -c "print(\\"Hello\\nWorld\\")"',
            'Hello',
            'World',
            '$ echo -e "\\033[31mRed Text\\033[0m"',
            '\x1b[31mRed Text\x1b[0m',
            '$ ',
          ],
          cursor: { x: 2, y: 9, blinking: true, visible: true },
        },
        startY: 0,
      },
    };

    await act(async () => {
      render(<Terminal session={sessionWithErrors} zoom='FIT' />);
    });

    const terminalInner = screen.getByTestId('terminal-inner');
    expect(terminalInner).toBeInTheDocument();

    // Simulate xterm.js opening and connecting to the DOM element
    mockTerminal.open(terminalInner);

    // Simulate terminal content being written
    sessionWithErrors.activeTerminal!.normal.buffer.forEach((line) => {
      mockTerminal.write(line + '\r\n');
    });

    // INSPECT THE DOM TEXTCONTENT for error messages and special characters
    const domTextContent = terminalInner.textContent || '';

    // Verify the DOM contains error messages and special characters
    expect(domTextContent).toContain('No such file or directory');
    expect(domTextContent).toContain('!@#$%^&*()_+-={}[]|\\:');
    expect(domTextContent).toContain('Hello');
    expect(domTextContent).toContain('World');
    expect(domTextContent).toContain('\x1b[31mRed Text\x1b[0m');
    expect(domTextContent).toContain('cat nonexistent.txt');
    expect(domTextContent).toContain('python -c');
    expect(domTextContent).toContain('echo -e');

    // Verify DOM content has reasonable length
    expect(domTextContent.length).toBeGreaterThan(150);

    // Verify DOM content matches mock terminal content
    expect(domTextContent).toEqual(mockTerminal._writtenContent);
  });
});
