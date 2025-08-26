import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers';
import unix from 'unix-dgram';
import { displayStateToAnsi, jsonParse } from '@ai-screen/shared';

import { getStatus } from './common';

import { queryDisplay } from '../tools/ansi';
import { errorLog } from '../tools/log';

import type {
  ReadStream as TTYReadStream,
  WriteStream as TTYWriteStream,
} from 'node:tty';
import type {
  AnsiDisplayState,
  DisconnectMessage,
  PipeClientMessage,
  PipeServerMessage,
} from '@ai-screen/shared';
import type { DeepPartial } from '../tools/util';

export default { connectSession };

const CONNECT_MS = 10 * 1000;

export interface ConnectParams extends DeepPartial<AnsiDisplayState> {
  name: string;
  stdin: TTYReadStream;
  stdout: TTYWriteStream & { fd?: number };
  exclusive?: boolean;
}
export async function connectSession(
  params: ConnectParams
): Promise<DisconnectMessage> {
  if (!params.stdout.fd) {
    throw new Error('NO_STDOUT');
  }
  const [{ sock_path }, display] = await Promise.all([
    getStatus(),
    queryDisplay(),
  ]);
  const sock = unix.createSocket('unix_dgram');
  let result: DisconnectMessage | undefined;
  try {
    result = await _runConnection({ sock, sock_path, ...display, ...params });
    return result;
  } finally {
    sock.close();
    if (result?.altScreen) {
      process.stdout.write(
        displayStateToAnsi({ altScreen: false, cursor: result.cursor })
      );
    } else {
      process.stdout.write(displayStateToAnsi({ cursor: { visible: true } }));
    }
  }
}
type RunParams = ConnectParams & {
  sock: ReturnType<typeof unix.createSocket>;
  sock_path: string;
};
async function _runConnection(params: RunParams): Promise<DisconnectMessage> {
  const { sock, sock_path, name, stdout, stdin } = params;
  const exclusive = params.exclusive ?? false;
  const stdout_fd = stdout.fd;
  if (!stdout_fd) {
    throw new Error('BAD_CONSOLE');
  }

  let connect_timeout: ReturnType<typeof setTimeout> | undefined = undefined;
  let attention_mode = false;

  function _onResize() {
    const msg = {
      type: 'resize' as const,
      name,
      rows: stdout.rows,
      columns: stdout.columns,
    };
    _send(sock, msg);
  }

  function _onData(data: Buffer) {
    const input = data.toString();
    let output = '';
    for (const char of input) {
      if (attention_mode) {
        attention_mode = false;
        switch (char) {
          case 'd':
          case 'D':
            _send(sock, { type: 'detach', name });
            break;
          case '\x01':
            output += '\x01';
            break;
          default:
            // Unknown command, ignore
            break;
        }
      } else if (char === '\x01') {
        attention_mode = true;
      } else {
        output += char;
      }
    }
    if (output.length > 0) {
      _send(sock, { type: 'write', name, data: output });
    }
  }

  try {
    return await new Promise<DisconnectMessage>((resolve, reject) => {
      connect_timeout = setTimeout(() => {
        errorLog('connect timeout');
        reject(new Error('timeout'));
      }, CONNECT_MS);
      sock.on('connect', () => {
        const msg = {
          type: 'connect' as const,
          name,
          exclusive,
          rows: stdout.rows,
          columns: stdout.columns,
          cursor: params.cursor,
          altScreen: params.altScreen,
        };
        _send(sock, msg, [stdout_fd]);
      });
      sock.on('error', (err) => {
        if (err.errno === -39) {
          reject(new Error('SERVER_DISCONNECTED'));
        } else {
          errorLog('connectSession: sock err:', err);
        }
      });
      sock.on('message', (msg) => {
        const obj = jsonParse<PipeServerMessage>(msg.toString('utf8'));
        if (obj) {
          if (obj.type === 'connect_success') {
            clearTimeout(connect_timeout);
            if (stdin.isTTY) {
              stdin.setRawMode(true);
            }
            stdin.on('data', _onData);
            stdin.on('resize', _onResize);
            stdin.resume();
          } else if (obj.type === 'disconnect') {
            resolve(obj);
          } else if (obj.type === 'error') {
            reject(new Error(obj.err));
          }
        }
      });
      const path = join(tmpdir(), randomUUID() + '.sock');
      sock.bind(path);
      sock.connect(sock_path);
    });
  } finally {
    clearTimeout(connect_timeout);
    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdin.removeAllListeners('data');
    stdin.removeAllListeners('resize');
    stdin.unref();
  }
}
function _send(
  sock: ReturnType<typeof unix.createSocket>,
  msg: PipeClientMessage,
  fds?: number[]
) {
  const buf = Buffer.from(JSON.stringify(msg));
  sock.send(buf, fds ?? []);
}
