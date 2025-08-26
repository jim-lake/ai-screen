import { spawn } from 'node:child_process';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';

interface ServerInfo {
  port: number;
  pid: number;
  process: ChildProcess;
}

let g_serverInfo: ServerInfo | null = null;

export async function startTestServer(): Promise<ServerInfo> {
  if (g_serverInfo) {
    return g_serverInfo;
  }

  return new Promise((resolve, reject) => {
    // Path to the CLI server entry point
    const cliPath = resolve(__dirname, '../../../cli/src/index.ts');

    // Start the CLI server in the background
    const child = spawn('tsx', [cliPath, '--server', '--port', '0'], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let server_output = '';
    const startup_timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Server startup timeout\nOutput: ${server_output}`));
    }, 15000); // Increased timeout

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      server_output += output;
      console.log('Server stdout:', output);

      // Look for server started message - adjust pattern based on actual CLI output
      const portMatch = output.match(/port[:\s]+(\d+)/i);
      const pidMatch = output.match(/pid[:\s]+(\d+)/i) || [
        null,
        process.pid.toString(),
      ];

      if (portMatch) {
        clearTimeout(startup_timeout);
        const port = parseInt(portMatch[1], 10);
        const pid = parseInt(pidMatch[1], 10);
        g_serverInfo = { port, pid, process: child };
        resolve(g_serverInfo);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      server_output += output;
      console.log('Server stderr:', output);
    });

    child.on('message', (message: any) => {
      console.log('Server message:', message);
      if (
        message &&
        typeof message === 'object' &&
        message.event === 'server-started'
      ) {
        clearTimeout(startup_timeout);
        g_serverInfo = { port: message.port, pid: message.pid, process: child };
        resolve(g_serverInfo);
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

  const { process: serverProcess, port } = g_serverInfo;

  try {
    // Try graceful shutdown via HTTP
    await fetch(`http://localhost:${port}/quit`);
  } catch {
    // Server might already be down
  }

  // Force kill if still running
  try {
    serverProcess.kill('SIGTERM');
    await setTimeoutPromise(100);
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
  } catch {
    // Process might already be dead
  }

  g_serverInfo = null;
}

export async function waitForServer(
  port: number,
  maxAttempts = 50
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
    await setTimeoutPromise(200);
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
}

export async function createTestSession(port: number, sessionName: string) {
  const sessionData = {
    shell: '/bin/bash',
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
  return result.data;
}

export async function writeToSession(
  port: number,
  sessionName: string,
  data: string
) {
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

export function getServerInfo(): ServerInfo | null {
  return g_serverInfo;
}
