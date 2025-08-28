import { spawn } from 'node:child_process';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { setTimeout as setTimeoutCallback } from 'node:timers';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { SessionJson, TerminalJson } from '@ai-screen/shared';
import { testLogger } from './test-logger';

interface ServerInfo {
  port: number;
  pid: number;
  process: ChildProcess;
}

let g_serverInfo: ServerInfo | null = null;

function _isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function startTestServer(): Promise<ServerInfo> {
  if (g_serverInfo) {
    return g_serverInfo;
  }

  return new Promise((resolve, reject) => {
    // Use the same pattern as CLI tests - spawn the test_server.ts helper
    const current_file = fileURLToPath(import.meta.url);
    const current_dir = dirname(current_file);
    const test_server_path = join(
      current_dir,
      '../../cli/tests/helpers/test_server.ts'
    );

    const child = spawn('tsx', [test_server_path], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let server_output = '';
    const startup_timeout = setTimeoutCallback(() => {
      child.kill('SIGTERM');
      reject(new Error(`Server startup timeout\nOutput: ${server_output}`));
    }, 10000);

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      server_output += output;
      testLogger.log('info', 'server', output.trim());
    });

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      server_output += output;
      testLogger.log('error', 'server', output.trim());
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
          g_serverInfo = { port: msg.port, pid: msg.pid, process: child };
          waitForServer(msg.port)
            .then(() => {
              resolve(g_serverInfo!);
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
  if (!g_serverInfo) {
    return;
  }

  const { process: serverProcess, port, pid } = g_serverInfo;

  try {
    // Try graceful shutdown via HTTP with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(`http://localhost:${port}/quit`, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch {
    // Server might already be down or not responding
  }

  if (serverProcess && pid) {
    const max_wait_time = 3000; // Reduced wait time
    const check_interval = 50;
    const max_attempts = max_wait_time / check_interval;

    for (let i = 0; i < max_attempts; i++) {
      if (!_isProcessRunning(pid)) {
        g_serverInfo = null;
        return;
      }
      await setTimeoutPromise(check_interval);
    }

    try {
      serverProcess.kill('SIGTERM');
      await setTimeoutPromise(200);
      if (_isProcessRunning(pid)) {
        serverProcess.kill('SIGKILL');
        await setTimeoutPromise(100);
      }
      g_serverInfo = null;
    } catch {
      g_serverInfo = null;
    }
  }
}

export async function waitForServer(
  port: number,
  maxAttempts = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/status`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await setTimeoutPromise(100);
  }
  throw new Error('Server failed to start within timeout');
}

export async function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const url = `http://localhost:${port}${path}`;

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  };

  if (
    body &&
    (method.toUpperCase() === 'POST' ||
      method.toUpperCase() === 'PUT' ||
      method.toUpperCase() === 'PATCH')
  ) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    let data: any;

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = { error: 'Failed to parse JSON' };
      }
    } else {
      const text = await response.text();
      data = { text };
    }

    return { status: response.status, data };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function createTestSession(
  port: number,
  sessionName: string
): Promise<SessionJson> {
  const sessionData = {
    shell: 'bash',
    cwd: process.cwd(),
    rows: 24,
    columns: 80,
    env: { ...process.env, PS1: '$ ' },
  };

  const result = await makeRequest(
    port,
    'POST',
    `/api/1/session/${sessionName}`,
    sessionData
  );
  if (result.status !== 200) {
    throw new Error(`Failed to create session: ${result.status}`);
  }

  // Create a terminal in the session since sessions don't auto-create terminals
  const terminalResult = await makeRequest(
    port,
    'POST',
    `/api/1/session/${sessionName}/terminal`,
    {}
  );
  if (terminalResult.status !== 200) {
    throw new Error(`Failed to create terminal: ${terminalResult.status}`);
  }

  // Get the updated session data that includes the terminal
  const sessionListResult = await makeRequest(port, 'GET', '/api/1/session');
  if (sessionListResult.status !== 200) {
    throw new Error(`Failed to get session list: ${sessionListResult.status}`);
  }

  const sessions = sessionListResult.data.sessions as SessionJson[];
  const updatedSession = sessions.find((s) => s.sessionName === sessionName);
  if (!updatedSession) {
    throw new Error(`Session ${sessionName} not found in session list`);
  }

  return updatedSession;
}

export async function writeToSession(
  port: number,
  sessionName: string,
  data: string
): Promise<void> {
  const result = await makeRequest(
    port,
    'POST',
    `/api/1/session/${sessionName}/write`,
    { data }
  );
  if (result.status !== 200) {
    throw new Error(`Failed to write to session: ${result.status}`);
  }
}

export async function getTerminalState(
  port: number,
  sessionName: string
): Promise<TerminalJson> {
  const result = await makeRequest(
    port,
    'GET',
    `/api/1/session/${sessionName}/terminal`
  );
  if (result.status !== 200) {
    throw new Error(`Failed to get terminal state: ${result.status}`);
  }
  return result.data as TerminalJson;
}

export async function waitForTerminalOutput(delay_ms = 100): Promise<void> {
  await setTimeoutPromise(delay_ms);
}

export function getServerInfo(): ServerInfo | null {
  return g_serverInfo;
}

export function getVisibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text.trim()) {
      return '';
    }
    if (/^(W{10,}|B{10,})$/i.test(text)) {
      return '';
    }
    return text + '\n';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') {
      return '';
    }
    let text = '';
    node.childNodes.forEach((child) => {
      text += getVisibleText(child);
    });
    return text;
  }

  return '';
}

export function withTestLogging<T extends any[], R>(
  testFn: (...args: T) => R | Promise<R>
) {
  return async (...args: T): Promise<R> => {
    testLogger.clear();
    try {
      const result = await testFn(...args);
      return result;
    } catch (error) {
      testLogger.dumpLogs();
      throw error;
    }
  };
}
