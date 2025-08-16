import { setTimeout } from 'node:timers/promises';
import { setTimeout as setTimeoutCallback } from 'node:timers';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { log } from './log_utils';

interface ApiResponse {
  status: number;
  data: Record<string, unknown>;
}

let g_serverPort: number;
let g_serverPid: number;
let g_serverProcess: ReturnType<typeof spawn> | undefined;

export function setServerInfo(port: number, pid: number): void {
  g_serverPort = port;
  g_serverPid = pid;
}

export function getServerInfo(): { port: number; pid: number } {
  return { port: g_serverPort, pid: g_serverPid };
}

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
function _isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
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
export async function startTestServer(): Promise<{
  port: number;
  pid: number;
}> {
  const current_file = fileURLToPath(import.meta.url);
  const current_dir = dirname(current_file);
  const test_server_path = join(current_dir, 'test_server.ts');

  return new Promise((resolve, reject) => {
    const child = spawn('tsx', [test_server_path], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    g_serverProcess = child;
    let server_output = '';
    const startup_timeout = setTimeoutCallback(() => {
      child.kill('SIGTERM');
      reject(new Error(`Server startup timeout\nOutput: ${server_output}`));
    }, 10000);
    child.stdout?.on('data', (data: Buffer) => {
      server_output += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      server_output += data.toString();
    });
    child.on('message', (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'event' in message
      ) {
        const msg = message as { event: string; port?: number; pid?: number };
        if (msg.event === 'server-started' && msg.port && msg.pid) {
          clearTimeout(startup_timeout);
          log(`startTestServer: pid: ${msg.pid} port: ${msg.port}`);
          setServerInfo(msg.port, msg.pid);
          waitForServer(msg.port)
            .then(() => {
              if (msg.port && msg.pid) {
                resolve({ port: msg.port, pid: msg.pid });
              } else {
                reject(new Error('Invalid server startup message'));
              }
            })
            .catch(reject);
        }
      }
    });
    child.on('error', (error) => {
      clearTimeout(startup_timeout);
      reject(
        new Error(
          `Server process error: ${error.message}\nOutput: ${server_output}`
        )
      );
    });
    child.on('exit', (code, signal) => {
      clearTimeout(startup_timeout);
      if (code !== 0 && code !== null) {
        reject(
          new Error(
            `Server process exited with code ${code}, signal ${signal}\nOutput: ${server_output}`
          )
        );
      }
    });
  });
}
export async function stopTestServer(): Promise<void> {
  const server_pid = g_serverPid;
  const server_process = g_serverProcess;

  try {
    await makeRequest('GET', '/quit');
  } catch {
    // Server might already be down or not responding
  }

  if (server_process && server_pid) {
    const max_wait_time = 5000;
    const check_interval = 50;
    const max_attempts = max_wait_time / check_interval;

    for (let i = 0; i < max_attempts; i++) {
      if (!_isProcessRunning(server_pid)) {
        g_serverProcess = undefined;
        return;
      }
      await setTimeout(check_interval);
    }
    try {
      server_process.kill('SIGTERM');
      await setTimeout(100);
      if (_isProcessRunning(server_pid)) {
        server_process.kill('SIGKILL');
      }
      g_serverProcess = undefined;
    } catch {
      g_serverProcess = undefined;
    }
  }
}
export async function createTestSession(
  session_name: string
): Promise<Record<string, unknown>> {
  const session_data = {
    shell: '/bin/bash',
    cwd: process.cwd(),
    rows: 24,
    columns: 80,
    env: { ...process.env, PS1: '$ ' },
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
export async function waitForTerminalOutput(delay_ms = 100): Promise<void> {
  await setTimeout(delay_ms);
}
