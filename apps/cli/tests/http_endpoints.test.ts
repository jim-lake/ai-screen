import { test, before, after } from 'node:test';
import assert from 'node:assert';

import {
  startTestServer,
  stopTestServer,
  makeRequest,
  getServerInfo,
} from './helpers/test_utils';

import type {
  SessionJson,
  SessionListJson,
  TerminalJson,
} from '@ai-screen/shared';

before(async () => {
  await startTestServer();
});

after(async () => {
  await stopTestServer();
});

void test('HTTP Endpoints', async (t) => {
  const { pid: g_server_pid } = getServerInfo();

  await t.test('server status endpoint', async () => {
    const result = await makeRequest('GET', '/status');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.port, 'number');
    assert.strictEqual(typeof result.data.sock_path, 'string');
    assert.strictEqual(result.data.pid, g_server_pid);
  });

  await t.test('create session', async () => {
    const session_data = {
      shell: '/bin/bash',
      cwd: process.cwd(),
      rows: 24,
      columns: 80,
      env: { ...process.env },
    };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session',
      session_data
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.sessionName, 'test-session');
    assert.strictEqual(Array.isArray(result.data.terminals), true);
  });

  await t.test('list sessions', async () => {
    const result = await makeRequest('GET', '/api/1/session');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(Array.isArray(result.data.sessions), true);

    const sessions = result.data.sessions as SessionJson[];
    assert.strictEqual(sessions.length >= 1, true);

    const session = sessions.find((s) => s.sessionName === 'test-session');
    assert.strictEqual(session?.sessionName, 'test-session');
  });

  await t.test('resize session', async () => {
    const resize_data = { rows: 30, columns: 100 };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    assert.strictEqual(result.status, 200);
    // Resize endpoint returns 200 status with no body
  });

  await t.test('resize non-existent session', async () => {
    const resize_data = { rows: 30, columns: 100 };

    const result = await makeRequest(
      'POST',
      '/api/1/session/non-existent/resize',
      resize_data
    );
    assert.strictEqual(result.status, 404);
  });

  await t.test('resize session with invalid data', async () => {
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      {}
    );
    assert.strictEqual(result.status, 400);
  });

  await t.test('write to session', async () => {
    const write_data = { data: 'echo "hello world"\n' };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/write',
      write_data
    );
    assert.strictEqual(result.status, 200);
  });
  await t.test('write to non-existent session', async () => {
    const write_data = { data: 'echo "hello"\n' };

    const result = await makeRequest(
      'POST',
      '/api/1/session/non-existent/write',
      write_data
    );
    assert.strictEqual(result.status, 404);
  });
  await t.test('write to session with invalid data', async () => {
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/write',
      {}
    );
    assert.strictEqual(result.status, 400);
  });
  await t.test('create terminal in session', async () => {
    const terminal_data = {
      shell: '/bin/sh',
      cwd: process.cwd(),
      env: { TEST: 'value' },
    };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/terminal',
      terminal_data
    );
    assert.strictEqual(result.status, 200);

    const terminal = result.data as TerminalJson;
    assert.strictEqual(typeof terminal.terminalId, 'number');
    assert.strictEqual(typeof terminal.normal, 'object');
    assert.strictEqual(typeof terminal.startY, 'number');
    assert.strictEqual(Array.isArray(terminal.normal.buffer), true);
    assert.strictEqual(typeof terminal.normal.cursor, 'object');
  });

  await t.test('get terminal state', async () => {
    const result = await makeRequest(
      'GET',
      '/api/1/session/test-session/terminal'
    );
    assert.strictEqual(result.status, 200);

    const terminal = result.data as TerminalJson;
    assert.strictEqual(typeof terminal.terminalId, 'number');
    assert.strictEqual(typeof terminal.normal, 'object');
    assert.strictEqual(typeof terminal.startY, 'number');

    const { normal } = terminal;
    assert.strictEqual(typeof normal.cursor, 'object');
    assert.strictEqual(Array.isArray(normal.buffer), true);

    const { cursor } = normal;
    assert.strictEqual(typeof cursor.x, 'number');
    assert.strictEqual(typeof cursor.y, 'number');
    assert.strictEqual(typeof cursor.blinking, 'boolean');
    assert.strictEqual(typeof cursor.visible, 'boolean');
  });

  await t.test('get terminal state for non-existent session', async () => {
    const result = await makeRequest(
      'GET',
      '/api/1/session/non-existent/terminal'
    );
    assert.strictEqual(result.status, 404);
  });

  await t.test('create another terminal in session', async () => {
    const terminal_data = {
      shell: '/bin/sh',
      cwd: process.cwd(),
      env: { TEST: 'value' },
    };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/terminal',
      terminal_data
    );
    assert.strictEqual(result.status, 200);

    const terminal = result.data as TerminalJson;
    assert.strictEqual(typeof terminal.terminalId, 'number');
    assert.strictEqual(typeof terminal.normal, 'object');
    assert.strictEqual(typeof terminal.startY, 'number');
  });

  await t.test('create terminal with minimal data', async () => {
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/terminal',
      {}
    );
    assert.strictEqual(result.status, 200);

    const terminal = result.data as TerminalJson;
    assert.strictEqual(typeof terminal.terminalId, 'number');
    assert.strictEqual(typeof terminal.normal, 'object');
  });

  await t.test('create terminal in non-existent session', async () => {
    const result = await makeRequest(
      'POST',
      '/api/1/session/non-existent/terminal',
      {}
    );
    assert.strictEqual(result.status, 404);
  });

  await t.test('create terminal with command array', async () => {
    const terminal_data = { command: ['ls', '-la'], cwd: process.cwd() };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/terminal',
      terminal_data
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminalId, 'number');
  });

  await t.test('verify terminal count after multiple creations', async () => {
    // Get session list to verify terminal count
    const result = await makeRequest('GET', '/api/1/session');
    assert.strictEqual(result.status, 200);

    const session_list = result.data as SessionListJson;
    const session = session_list.sessions.find(
      (s) => s.sessionName === 'test-session'
    );
    assert.strictEqual(session !== undefined, true);
    if (session) {
      assert.strictEqual(session.terminals.length >= 1, true); // Should have at least 1 terminal
    }
  });

  await t.test('create session with duplicate name should fail', async () => {
    const session_data = {
      shell: '/bin/bash',
      cwd: process.cwd(),
      rows: 24,
      columns: 80,
      env: { ...process.env },
    };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session',
      session_data
    );
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.err, 'name_in_use');
  });
});
