import { setTimeout } from 'node:timers/promises';

interface ApiResponse {
  status: number;
  data: Record<string, unknown>;
}

let g_serverPort: number;
let g_serverPid: number;

export function setServerInfo(port: number, pid: number): void {
  g_serverPort = port;
  g_serverPid = pid;
}

export function getServerInfo(): { port: number; pid: number } {
  return { port: g_serverPort, pid: g_serverPid };
}

// Helper function to make HTTP requests
export async function makeRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ApiResponse> {
  const url = `http://localhost:${g_serverPort}${path}`;
  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json' },
  };

  if (
    body &&
    (method.toUpperCase() === 'POST' ||
      method.toUpperCase() === 'PUT' ||
      method.toUpperCase() === 'PATCH')
  ) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data: Record<string, unknown>;

  const content_type = response.headers.get('content-type');
  if (content_type?.includes('application/json')) {
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = { error: 'Failed to parse JSON' };
    }
  } else {
    const text = await response.text();
    data = { text };
  }

  return { status: response.status, data };
}

// Helper function to check if a process is running
function _isProcessRunning(pid: number): boolean {
  try {
    // On Unix systems, sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Helper function to wait for server to be ready
export async function waitForServer(
  port: number,
  max_attempts = 30
): Promise<void> {
  for (let i = 0; i < max_attempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/status`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await setTimeout(100);
  }
  throw new Error('Server failed to start within timeout');
}

// Helper function to start server for tests
export async function startTestServer(): Promise<{
  port: number;
  pid: number;
}> {
  const { startServer } = await import('../../src/index.js');
  const result = await startServer(true);
  setServerInfo(result.port, result.pid);

  // Wait for server to be ready
  await waitForServer(result.port);

  return { port: result.port, pid: result.pid };
}

// Helper function to stop server and wait for it to actually quit
export async function stopTestServer(): Promise<void> {
  const server_pid = g_serverPid;

  try {
    // Send quit request to server
    await makeRequest('GET', '/quit');
  } catch {
    // Server might already be down or not responding
  }

  // Wait for the process to actually terminate
  if (server_pid) {
    const max_wait_time = 5000; // 5 seconds max wait
    const check_interval = 50; // Check every 50ms
    const max_attempts = max_wait_time / check_interval;

    for (let i = 0; i < max_attempts; i++) {
      if (!_isProcessRunning(server_pid)) {
        return; // Process has terminated
      }
      await setTimeout(check_interval);
    }

    // If process is still running after timeout, force kill it
    try {
      process.kill(server_pid, 'SIGTERM');
      await setTimeout(100);

      // Check if SIGTERM worked
      if (_isProcessRunning(server_pid)) {
        process.kill(server_pid, 'SIGKILL');
      }
    } catch {
      // Process might have already terminated
    }
  }
}

// Helper function to create a test session
export async function createTestSession(
  session_name: string
): Promise<Record<string, unknown>> {
  const session_data = {
    shell: '/bin/bash',
    cwd: process.cwd(), // Use current working directory instead of /tmp
    rows: 24,
    columns: 80,
    env: { ...process.env, PS1: '$ ' }, // Use current environment instead of hardcoded paths
  };

  const result = await makeRequest(
    'POST',
    `/api/1/session/${session_name}`,
    session_data
  );
  if (result.status !== 200) {
    throw new Error(`Failed to create session: ${result.status}`);
  }
  return result.data;
}

// Helper function to create a terminal in a session
export async function createTerminalInSession(
  session_name: string
): Promise<Record<string, unknown>> {
  const result = await makeRequest(
    'POST',
    `/api/1/session/${session_name}/terminal`,
    {}
  );
  if (result.status !== 200) {
    throw new Error(`Failed to create terminal: ${result.status}`);
  }
  return result.data;
}

// Helper function to get terminal state
export async function getTerminalState(
  session_name: string
): Promise<{
  terminal_id: number;
  screen_state: { content: string; cursorX: number; cursorY: number };
  terminal_count: number;
}> {
  const result = await makeRequest(
    'GET',
    `/api/1/session/${session_name}/terminal`
  );
  if (result.status !== 200) {
    throw new Error(`Failed to get terminal state: ${result.status}`);
  }

  return {
    terminal_id: result.data.terminal_id as number,
    screen_state: result.data.screen_state as {
      content: string;
      cursorX: number;
      cursorY: number;
    },
    terminal_count: result.data.terminal_count as number,
  };
}

// Helper function to write to session
export async function writeToSession(
  session_name: string,
  data: string
): Promise<void> {
  const result = await makeRequest(
    'POST',
    `/api/1/session/${session_name}/write`,
    { data }
  );
  if (result.status !== 200) {
    throw new Error(`Failed to write to session: ${result.status}`);
  }
}

// Helper function to wait for terminal output to settle
export async function waitForTerminalOutput(delay_ms = 100): Promise<void> {
  await setTimeout(delay_ms);
}
