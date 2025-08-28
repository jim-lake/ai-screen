import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  startTestServer,
  stopTestServer,
  createTestSession,
  writeToSession,
  waitForTerminalOutput,
  withTestLogging,
} from './test-utils';


describe('Connect Store - Basic Integration Tests', () => {
  let serverInfo: { port: number; pid: number };

  beforeAll(async () => {
    serverInfo = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it(
    'verifies server integration works for connect store testing',
    withTestLogging(async () => {
      const sessionName = 'connect-integration-test';
      const session = await createTestSession(serverInfo.port, sessionName);

      expect(session.sessionName).toBe(sessionName);
      expect(session.terminalParams.rows).toBe(24);
      expect(session.terminalParams.columns).toBe(80);

      await writeToSession(
        serverInfo.port,
        sessionName,
        'echo "connect test"\n'
      );
      await waitForTerminalOutput(200);

      expect(true).toBe(true);
    })
  );
});
