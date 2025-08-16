import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers';
import {
  setBaseUrl,
  getStatus,
  connectSession,
  createSession,
  getSessions,
  killServer,
} from './client';
import server from './server';
import { CliExitCode } from './cli_exit_code';
import { isCode } from './tools/util';
import { errorLog, debugLog, setShowTime } from './tools/log';

import type { ConnectParams } from './client';
import type { ServerStartResult } from './server';

export {
  getStatus,
  createSession,
  getSessions,
  killServer,
  connectSession,
} from './client';
export type { ConnectParams } from './client';
export type { SessionParams } from './lib/session';

export const VERSION = '__VERSION__';
export default {
  getSessions,
  ensureServer,
  startServer,
  killServer,
  connectSession,
  createSession,
  VERSION,
};

const START_TIMEOUT = 10 * 1000;

export interface SetupClientParams {
  port: number;
}
export function setupClient(params: SetupClientParams) {
  setBaseUrl(`http://localhost:${params.port}`);
}
export interface EnsureServerParams {
  port: number;
}
export async function ensureServer(params: EnsureServerParams) {
  try {
    setupClient(params);
    return await getStatus();
  } catch (e) {
    if (e instanceof Error && e.message === 'NO_SERVER') {
      await startServer({ foreground: false, port: params.port });
    } else {
      throw e;
    }
  }
}
export interface StartServerParams {
  foreground: boolean;
  port: number;
}
export async function startServer(
  params: StartServerParams
): Promise<ServerStartResult> {
  if (params.foreground) {
    try {
      const result = await server.start({ port: params.port });
      process.send?.({ event: 'started', ...result });
      return result;
    } catch (e) {
      setShowTime(false);
      if (isCode(e, 'EADDRINUSE')) {
        throw new Error('ALREADY_RUNNING', { cause: e });
      }
      throw e;
    }
  } else {
    return await _startBackground(params);
  }
}
export type AttachParams = Omit<ConnectParams, 'name'> & { name?: string };
export async function attachToSession(params: AttachParams) {
  const name =
    params.name ??
    (await getSessions()).find((s) => s.clients.length === 0)?.name;

  if (!name) {
    throw new Error('NO_DETATCHED_SESSION');
  }
  return await connectSession({ ...params, name });
}
async function _startBackground(
  params: StartServerParams
): Promise<ServerStartResult> {
  let child: ReturnType<typeof fork> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
  try {
    return await new Promise((resolve, reject) => {
      const opts = {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore' as const,
      };
      const script = process.argv[1] ?? fileURLToPath(import.meta.url);
      const args = [
        '--server',
        '--foreground',
        '--server-port',
        String(params.port),
      ];
      child = fork(script, args, opts);
      child.on('spawn', () => {
        debugLog('server forked:', child?.pid);
      });
      child.once('message', (msg: ServerStartResult) => {
        debugLog('server message:', msg);
        resolve(msg);
      });
      child.once('error', (e) => {
        errorLog('failed to fork server:', e);
        reject(new Error('error'));
      });
      child.once('exit', (code: number, reason) => {
        debugLog('server exit:', code, reason);
        reject(new Error(CliExitCode[code]));
      });
      timeout = setTimeout(() => {
        reject(new Error('timeout'));
      }, START_TIMEOUT);
    });
  } finally {
    clearTimeout(timeout);
    if (child) {
      child.channel?.unref();
      child.unref();
    }
  }
}
function _ignoreError(e: Error) {
  debugLog('_ignoreError: e:', e);
}
