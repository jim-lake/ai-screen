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

  // Create a terminal in the session before testing resize operations
  await t.test('create terminal for resize tests', async () => {
    const terminal_data = {
      shell: '/bin/bash',
      cwd: process.cwd(),
      env: { ...process.env },
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
  });

  // Comprehensive resize endpoint validation tests
  await t.test('resize session with zero rows', async () => {
    const resize_data = { rows: 0, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Zero rows should be rejected as invalid when terminal exists
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with zero columns', async () => {
    const resize_data = { rows: 24, columns: 0 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Zero columns should be rejected as invalid when terminal exists
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with negative rows', async () => {
    const resize_data = { rows: -10, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Negative rows should be rejected as invalid when terminal exists
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with negative columns', async () => {
    const resize_data = { rows: 24, columns: -20 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Negative columns should be rejected as invalid when terminal exists
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with negative infinity rows', async () => {
    const resize_data = { rows: -Infinity, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Infinity values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with negative infinity columns', async () => {
    const resize_data = { rows: 24, columns: -Infinity };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Infinity values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with positive infinity rows', async () => {
    const resize_data = { rows: Infinity, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Infinity values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with positive infinity columns', async () => {
    const resize_data = { rows: 24, columns: Infinity };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Infinity values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with NaN rows', async () => {
    const resize_data = { rows: NaN, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // NaN values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with NaN columns', async () => {
    const resize_data = { rows: 24, columns: NaN };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // NaN values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with float rows', async () => {
    const resize_data = { rows: 24.5, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Float values should be rejected (xterm only accepts integers)
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with float columns', async () => {
    const resize_data = { rows: 24, columns: 80.7 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Float values should be rejected (xterm only accepts integers)
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with string rows', async () => {
    const resize_data = { rows: '24', columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // String numbers should be accepted (converted to integers)
    assert.strictEqual(result.status, 200);
  });

  await t.test('resize session with string columns', async () => {
    const resize_data = { rows: 24, columns: '80' };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // String numbers should be accepted (converted to integers)
    assert.strictEqual(result.status, 200);
  });

  await t.test('resize session with null rows', async () => {
    const resize_data = { rows: null, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Null values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with null columns', async () => {
    const resize_data = { rows: 24, columns: null };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Null values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with undefined rows', async () => {
    const resize_data = { rows: undefined, columns: 80 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Undefined values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with undefined columns', async () => {
    const resize_data = { rows: 24, columns: undefined };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Undefined values should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  // Test boundary values
  await t.test('resize session with minimum valid dimensions', async () => {
    const resize_data = { rows: 1, columns: 1 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    assert.strictEqual(result.status, 200);
  });

  await t.test('resize session with large valid dimensions', async () => {
    const resize_data = { rows: 1000, columns: 1000 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    assert.strictEqual(result.status, 200);
  });

  await t.test('resize session with very large dimensions', async () => {
    const resize_data = { rows: 10000, columns: 10000 };
    const result = await makeRequest(
      'POST',
      '/api/1/session/test-session/resize',
      resize_data
    );
    // Very large dimensions should be rejected as invalid
    assert.strictEqual(result.status, 400);
  });

  await t.test('resize session with typical terminal dimensions', async () => {
    const test_cases = [
      { rows: 24, columns: 80 }, // Standard terminal
      { rows: 25, columns: 80 }, // DOS standard
      { rows: 30, columns: 120 }, // Wide terminal
      { rows: 50, columns: 132 }, // Large terminal
      { rows: 43, columns: 80 }, // EGA standard
    ];

    for (const dimensions of test_cases) {
      const result = await makeRequest(
        'POST',
        '/api/1/session/test-session/resize',
        dimensions
      );
      assert.strictEqual(
        result.status,
        200,
        `Failed for dimensions ${dimensions.rows}x${dimensions.columns}`
      );
    }
  });

  // Test server stability after invalid inputs
  await t.test(
    'server remains responsive after invalid resize attempts',
    async () => {
      // Send several invalid resize requests
      const invalid_requests = [
        { rows: -1, columns: -1 },
        { rows: 0, columns: 0 },
        { rows: NaN, columns: NaN },
        { rows: Infinity, columns: -Infinity },
      ];

      for (const invalid_data of invalid_requests) {
        await makeRequest(
          'POST',
          '/api/1/session/test-session/resize',
          invalid_data
        );
      }

      // Verify server is still responsive with a valid request
      const status_result = await makeRequest('GET', '/status');
      assert.strictEqual(status_result.status, 200);

      // Verify session is still accessible
      const session_result = await makeRequest('GET', '/api/1/session');
      assert.strictEqual(session_result.status, 200);

      // Verify we can still resize with valid dimensions
      const valid_resize = await makeRequest(
        'POST',
        '/api/1/session/test-session/resize',
        { rows: 25, columns: 85 }
      );
      assert.strictEqual(valid_resize.status, 200);
    }
  );

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
