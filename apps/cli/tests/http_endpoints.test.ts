import { test, before, after } from 'node:test';
import assert from 'node:assert';

interface ApiResponse {
  status: number;
  data: Record<string, unknown>;
}

let g_serverPort: number;
let g_serverPid: number;

// Helper function to make HTTP requests
async function _makeRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ApiResponse> {
  const url = `http://localhost:${g_serverPort}${path}`;
  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data: Record<string, unknown>;
  
  const content_type = response.headers.get('content-type');
  if (content_type?.includes('application/json')) {
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      data = { error: 'Failed to parse JSON' };
    }
  } else {
    const text = await response.text();
    data = { text };
  }

  return {
    status: response.status,
    data,
  };
}

// Helper function to wait for server to be ready
async function _waitForServer(port: number, max_attempts = 30): Promise<void> {
  for (let i = 0; i < max_attempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/status`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Server failed to start within timeout');
}

before(async () => {
  // Start server directly in this process
  const { startServer } = await import('../src/index.js');
  const result = await startServer(true);
  g_serverPort = result.port;
  g_serverPid = result.pid;
  
  // Wait for server to be ready
  await _waitForServer(g_serverPort);
});

after(async () => {
  // Kill the server by making a request to /quit
  try {
    await _makeRequest('GET', '/quit');
  } catch {
    // Server might already be down
  }
});

void test('HTTP Endpoints', async (t) => {
  await t.test('server status endpoint', async () => {
    const result = await _makeRequest('GET', '/status');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.port, 'number');
    assert.strictEqual(typeof result.data.sock_path, 'string');
    assert.strictEqual(result.data.pid, g_serverPid);
  });

  await t.test('create session', async () => {
    const session_data = {
      shell: '/bin/bash',
      cwd: '/tmp',
      rows: 24,
      columns: 80,
      env: { HOME: '/tmp', PATH: '/bin:/usr/bin' },
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session', session_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.name, 'test-session');
    assert.strictEqual(Array.isArray(result.data.terminals), true);
  });

  await t.test('list sessions', async () => {
    const result = await _makeRequest('GET', '/api/1/session');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(Array.isArray(result.data.session_list), true);
    
    const session_list = result.data.session_list as { name: string }[];
    assert.strictEqual(session_list.length >= 1, true);
    
    const session = session_list.find((s) => s.name === 'test-session');
    assert.strictEqual(session?.name, 'test-session');
  });

  await t.test('resize session', async () => {
    const resize_data = {
      rows: 30,
      columns: 100,
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session/resize', resize_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.success, true);
    assert.strictEqual(result.data.rows, 30);
    assert.strictEqual(result.data.columns, 100);
  });

  await t.test('resize non-existent session', async () => {
    const resize_data = {
      rows: 30,
      columns: 100,
    };

    const result = await _makeRequest('POST', '/api/1/session/non-existent/resize', resize_data);
    assert.strictEqual(result.status, 404);
  });

  await t.test('resize session with invalid data', async () => {
    const result = await _makeRequest('POST', '/api/1/session/test-session/resize', {});
    assert.strictEqual(result.status, 400);
  });

  await t.test('write to session', async () => {
    const write_data = {
      data: 'echo "hello world"\n',
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session/write', write_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.success, true);
    assert.strictEqual(result.data.bytes_written, write_data.data.length);
  });

  await t.test('write to non-existent session', async () => {
    const write_data = {
      data: 'echo "hello"\n',
    };

    const result = await _makeRequest('POST', '/api/1/session/non-existent/write', write_data);
    assert.strictEqual(result.status, 404);
  });

  await t.test('write to session with invalid data', async () => {
    const result = await _makeRequest('POST', '/api/1/session/test-session/write', {});
    assert.strictEqual(result.status, 400);
  });

  await t.test('create terminal in session', async () => {
    const terminal_data = {
      shell: '/bin/sh',
      cwd: '/home',
      env: { TEST: 'value' },
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session/terminal', terminal_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual(typeof result.data.is_active, 'boolean');
    assert.strictEqual((result.data.terminal_count as number) >= 1, true); // Should have at least 1 terminal now
  });

  await t.test('get terminal state', async () => {
    const result = await _makeRequest('GET', '/api/1/session/test-session/terminal');
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(typeof result.data.screen_state, 'object');
    
    const screen_state = result.data.screen_state as Record<string, unknown>;
    assert.strictEqual(typeof screen_state.content, 'string');
    assert.strictEqual(typeof screen_state.cursorX, 'number');
    assert.strictEqual(typeof screen_state.cursorY, 'number');
    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual((result.data.terminal_count as number) >= 1, true);
  });

  await t.test('get terminal state for non-existent session', async () => {
    const result = await _makeRequest('GET', '/api/1/session/non-existent/terminal');
    assert.strictEqual(result.status, 404);
  });

  await t.test('create another terminal in session', async () => {
    const terminal_data = {
      shell: '/bin/sh',
      cwd: '/home',
      env: { TEST: 'value' },
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session/terminal', terminal_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
    assert.strictEqual(typeof result.data.terminal_count, 'number');
    assert.strictEqual(typeof result.data.is_active, 'boolean');
    assert.strictEqual((result.data.terminal_count as number) >= 2, true); // Should have at least 2 terminals now
  });

  await t.test('create terminal with minimal data', async () => {
    const result = await _makeRequest('POST', '/api/1/session/test-session/terminal', {});
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
    assert.strictEqual(result.data.session_name, 'test-session');
  });

  await t.test('create terminal in non-existent session', async () => {
    const result = await _makeRequest('POST', '/api/1/session/non-existent/terminal', {});
    assert.strictEqual(result.status, 404);
  });

  await t.test('create terminal with command array', async () => {
    const terminal_data = {
      command: ['ls', '-la'],
      cwd: '/tmp',
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session/terminal', terminal_data);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(typeof result.data.terminal_id, 'number');
  });

  await t.test('verify terminal count after multiple creations', async () => {
    const result = await _makeRequest('GET', '/api/1/session/test-session/terminal');
    assert.strictEqual(result.status, 200);
    assert.strictEqual((result.data.terminal_count as number) >= 4, true); // Should have multiple terminals by now
  });

  await t.test('create session with duplicate name should fail', async () => {
    const session_data = {
      shell: '/bin/bash',
      cwd: '/tmp',
      rows: 24,
      columns: 80,
      env: { HOME: '/tmp' },
    };

    const result = await _makeRequest('POST', '/api/1/session/test-session', session_data);
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.data.err, 'name_in_use');
  });
});
