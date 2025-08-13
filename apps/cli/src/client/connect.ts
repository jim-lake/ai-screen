import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import unix from 'unix-dgram';

import { request } from './request';
import { log, errorLog } from '../tools/log';
import { jsonParse } from '../tools/util';

import type {
  ReadStream as TTYReadStream,
  WriteStream as TTYWriteStream,
} from 'node:tty';
import type { PipeMessage } from '../lib/pipe';

export default { connectSession };

const CONNECT_MS = 10 * 1000;

export interface ConnectParams {
  name: string;
  stdin: TTYReadStream;
  stdout: TTYWriteStream & { fd?: number };
  exclusive?: boolean;
}
export async function connectSession(params: ConnectParams) {
  if (!params.stdout.fd) {
    throw new Error('NO_STDOUT');
  }

  const opts = { url: '/api/1/status' };
  interface StatusBody {
    sock_path: string;
  }
  const result = await request<StatusBody>(opts);
  if (result.err?.code === 'ECONNREFUSED') {
    throw new Error('NO_SERVER', { cause: result.err });
  } else if (result.err) {
    throw result.err;
  } else if (!result.body) {
    throw new Error('NO_SERVER');
  }
  const sock = unix.createSocket('unix_dgram');
  try {
    await _runConnection({ sock, sock_path: result.body.sock_path, ...params });
  } finally {
    sock.close();
  }
}
type RunParams = ConnectParams & {
  sock: ReturnType<typeof unix.createSocket>;
  sock_path: string;
};
async function _runConnection(params: RunParams) {
  const { sock, sock_path, name, stdout, stdin } = params;
  const exclusive = params.exclusive ?? false;
  const stdout_fd = stdout.fd;
  if (!stdout_fd) {
    throw new Error('BAD_CONSOLE');
  }

  let connect_timeout: ReturnType<typeof setTimeout> | null = null;
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
    await new Promise<void>((resolve, reject) => {
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
        };
        _send(sock, msg, [stdout_fd]);
        log('fd sent');
      });
      sock.on('error', (err) => {
        errorLog('connectSession: sock err:', err);
      });
      sock.on('message', (msg, rinfo) => {
        log('connect msg:', msg.toString('utf8'), rinfo);
        const obj = jsonParse<PipeMessage>(msg.toString('utf8'));
        if (obj) {
          const { type } = obj;
          if (type === 'connect_success') {
            if (connect_timeout) {
              clearTimeout(connect_timeout);
              connect_timeout = null;
            }
            stdin.setRawMode(true);
            stdin.on('data', _onData);
            stdin.on('resize', _onResize);
          } else if (type === 'disconnect') {
            resolve();
          } else if (type === 'connect_error') {
            reject(new Error(obj.err));
          }
        }
      });
      const path = join(tmpdir(), randomUUID() + '.sock');
      sock.bind(path);
      sock.connect(sock_path);
    });
  } finally {
    if (connect_timeout !== null) {
      clearTimeout(connect_timeout);
      connect_timeout = null;
    }
    stdin.setRawMode(false);
    stdin.off('data', _onData);
    stdin.off('resize', _onResize);
  }
}
function _send(
  sock: ReturnType<typeof unix.createSocket>,
  msg: PipeMessage,
  fds?: number[]
) {
  const buf = Buffer.from(JSON.stringify(msg));
  sock.send(buf, fds ?? []);
}
