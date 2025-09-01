import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Terminal from '../src/components/terminal';
import Api from '../src/tools/api';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  waitForTerminalOutput,
  getVisibleText,
  withTestLogging,
} from './test-utils';

vi.mock('../src/tools/measure', () => ({
  measureCharSize: vi.fn(() => ({ width: 8, height: 16 })),
}));

vi.mock('../src/tools/component_size', () => ({
  useComponentSize: vi.fn(() => [vi.fn(), { width: 640, height: 384 }]),
}));

vi.mock('../src/stores/setting_store', () => ({
  useSetting: vi.fn((key: string) => {
    if (key === 'fontFamily') return 'monospace';
    if (key === 'fontSize') return 14;
    return null;
  }),
}));

describe('XTermReactRenderer Input and Paste Events', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
    Api.init();
    Api.setCustomBaseUrl(`http://localhost:${serverInfo.port}`);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'handles input events correctly',
    withTestLogging(async () => {
      const sessionName = 'input-event-test';
      const session = await createTestSession(serverInfo.port, sessionName);
      let renderResult: any;
      await act(async () => {
        renderResult = render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      fireEvent.focus(terminalInner);
      fireEvent.input(terminalInner, { target: { textContent: 'hello' } });

      await waitForTerminalOutput(300);

      await act(async () => {
        renderResult.rerender(<Terminal session={session} zoom='EXPAND' />);
      });

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('hello');
    })
  );

  it(
    'handles paste events correctly',
    withTestLogging(async () => {
      const sessionName = 'paste-event-test';
      const session = await createTestSession(serverInfo.port, sessionName);
      let renderResult: any;
      await act(async () => {
        renderResult = render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      fireEvent.focus(terminalInner);

      const pasteData = 'echo "pasted text"';
      fireEvent.paste(terminalInner, {
        clipboardData: { getData: () => pasteData },
      });

      await waitForTerminalOutput(300);

      await act(async () => {
        renderResult.rerender(<Terminal session={session} zoom='EXPAND' />);
      });

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('echo "pasted text"');
    })
  );

  it(
    'paste event executes pasted command',
    withTestLogging(async () => {
      const sessionName = 'paste-execute-test';
      const session = await createTestSession(serverInfo.port, sessionName);
      let renderResult: any;
      await act(async () => {
        renderResult = render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      fireEvent.focus(terminalInner);

      const pasteData = 'echo "paste works"\n';
      fireEvent.paste(terminalInner, {
        clipboardData: { getData: () => pasteData },
      });

      await waitForTerminalOutput(500);

      await act(async () => {
        renderResult.rerender(<Terminal session={session} zoom='EXPAND' />);
      });

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('paste works');
    })
  );

  it(
    'handles multi-line paste correctly',
    withTestLogging(async () => {
      const sessionName = 'multiline-paste-test';
      const session = await createTestSession(serverInfo.port, sessionName);
      let renderResult: any;
      await act(async () => {
        renderResult = render(<Terminal session={session} zoom='EXPAND' />);
      });
      await waitForTerminalOutput(300);

      const terminalInner = screen.getByTestId('terminal-inner');
      fireEvent.focus(terminalInner);

      const pasteData = 'echo "line1"\necho "line2"\n';
      fireEvent.paste(terminalInner, {
        clipboardData: { getData: () => pasteData },
      });

      await waitForTerminalOutput(800);

      await act(async () => {
        renderResult.rerender(<Terminal session={session} zoom='EXPAND' />);
      });

      const textContent = getVisibleText(terminalInner);
      expect(textContent).toContain('line1');
      expect(textContent).toContain('line2');
    })
  );
});
