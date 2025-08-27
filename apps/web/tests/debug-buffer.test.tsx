import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  getTerminalState,
  waitForTerminalOutput,
} from './test-utils';

describe('Debug Terminal Buffer', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('shows what is actually in the terminal buffer', async () => {
    const sessionName = 'debug-session';
    const session = await createTestSession(serverInfo.port, sessionName);

    console.log('Session created:', session);

    // Execute a command
    await writeToSession(serverInfo.port, sessionName, 'echo "Hello Debug"\n');
    await waitForTerminalOutput(500); // Wait longer

    // Get terminal state
    const terminalState = await getTerminalState(serverInfo.port, sessionName);
    
    console.log('Terminal state:', JSON.stringify(terminalState, null, 2));
    console.log('Buffer contents:');
    terminalState.normal.buffer.forEach((line, index) => {
      console.log(`  [${index}]: "${line}"`);
    });

    // Just verify we got some data
    expect(terminalState.normal.buffer.length).toBeGreaterThan(0);
  });
});
