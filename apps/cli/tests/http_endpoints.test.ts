import { test, before, after } from 'node:test';
import assert from 'node:assert';

import {
  startTestServer,
  stopTestServer,
  makeRequest,
  getServerInfo,
} from './helpers/test_utils';

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
    assert.strictEqual(result.data.session_name, 'test-session');
    assert.strictEqual(Array.isArray(result.data.terminal_list), true);
  });

  await t.test('list sessions', async () => {
    const result = await makeRequest('GET', '/api/1/session');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(Array.isArray(result.data.session_list), true);

    const session_list = result.data.session_list as { name: string }[];
    assert.strictEqual(session_list.length >= 1, true);

    const session = session_list.find((s) => s.session_name === 'test-session');
    assert.strictEqual(session?.session_name, 'test-session');
  });

  await t.test('resize session', async () => {
    const resize_data = { rows: 30, columns: 100 };

    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.rows, 30);
    assert.strictEqual(result.data.columns, 100);
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
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual(typeof result.data.is_active, 'boolean');
    assert.strictEqual((result.data.terminal_count as number) >= 1, true); // Should have at least 1 terminal now
  });

  await t.test('get terminal state', async () => {
    const result = await makeRequest(
      'GET',
      '/api/1/session/test-session/terminal'
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(typeof result.data.screen_state, 'object');

    const screen_state = result.data.screen_state as Record<string, unknown>;
    assert.strictEqual(typeof screen_state.normal, 'object');
    assert.strictEqual(typeof screen_state.startY, 'number');

    const normal = screen_state.normal as Record<string, unknown>;
    assert.strictEqual(typeof normal.cursor, 'object');
    assert.strictEqual(Array.isArray(normal.buffer), true);

    const cursor = normal.cursor as Record<string, unknown>;
    assert.strictEqual(typeof cursor.x, 'number');
    assert.strictEqual(typeof cursor.y, 'number');
    assert.strictEqual(typeof cursor.blinking, 'boolean');
    assert.strictEqual(typeof cursor.visible, 'boolean');

    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual((result.data.terminal_count as number) >= 1, true);
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
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual(typeof result.data.is_active, 'boolean');
    assert.strictEqual((result.data.terminal_count as number) >= 2, true); // Should have at least 2 terminals now
  });

  await t.test('create terminal with minimal data', async () => {
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/terminal',
      {}
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
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
    assert.strictEqual(typeof result.data.terminal_id, 'number');
  });

  await t.test('verify terminal count after multiple creations', async () => {
    const result = await makeRequest(
      'GET',
      '/api/1/session/test-session/terminal'
    );
    assert.strictEqual(result.status, 200);
    assert.strictEqual((result.data.terminal_count as number) >= 1, true); // Should have at least 1 terminal
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
