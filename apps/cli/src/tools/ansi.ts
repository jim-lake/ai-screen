/* eslint-disable no-control-regex */
import { setTimeout, clearTimeout } from 'node:timers';
import type { AnsiDisplayState } from '@ai-screen/shared';

import type { DeepPartial, Require } from './util';

export default { queryDisplay };

const TIMEOUT = 1000;

export async function queryDisplay(): Promise<DeepPartial<AnsiDisplayState>> {
  const ret: Require<DeepPartial<AnsiDisplayState>, 'cursor'> = {
    cursor: {
      x: undefined,
      y: undefined,
      visible: undefined,
      blinking: undefined,
    },
    altScreen: undefined,
  };
  if (!process.stdout.isTTY) {
    return ret;
  }
  const queries = [
    '\x1b[6n', // cursor position
  ].join('');

  try {
    return await new Promise((resolve) => {
      const timer = setTimeout(() => {
        _cleanup();
        resolve(ret);
      }, TIMEOUT);
      function _cleanup() {
        clearTimeout(timer);
        process.stdin.off('data', _onData);
      }
      let response = '';
      function _onData(chunk: Buffer) {
        response += chunk.toString('utf8');
        // Cursor position: ESC[row;colR
        for (const match of response.matchAll(/\x1b\[(\d+);(\d+)R/g)) {
          if (match[1] !== undefined && match[2] !== undefined) {
            ret.cursor.x = parseInt(match[2]);
            ret.cursor.y = parseInt(match[1]);
          }
        }

        if (ret.cursor.x !== undefined && ret.cursor.y !== undefined) {
          _cleanup();
          resolve(ret);
        }
      }
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', _onData);
      process.stdout.write(queries);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.unref();
  }
}
