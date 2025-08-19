/* eslint-disable no-control-regex */
import { setTimeout, clearTimeout } from 'node:timers';

export default { queryDisplay, displayStateToAnsi };

const TIMEOUT = 1000;

type Require<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export interface CursorState {
  x?: number;
  y?: number;
  visible?: boolean;
  blinking?: boolean;
}
export interface AnsiDisplayState {
  cursor?: CursorState;
  altScreen?: boolean;
}
export async function queryDisplay(): Promise<AnsiDisplayState> {
  const ret: Require<AnsiDisplayState, 'cursor'> = {
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
export function displayStateToAnsi(state: AnsiDisplayState): string {
  const codes: string[] = [];
  if (state.altScreen !== undefined) {
    codes.push(state.altScreen ? '\x1b[?1049h' : '\x1b[?1049l');
  }
  if (state.cursor) {
    const { x, y, visible, blinking } = state.cursor;
    if (x !== undefined && y !== undefined) {
      codes.push(`\x1b[${y};${x}H`);
    }
    if (visible !== undefined) {
      codes.push(visible ? '\x1b[?25h' : '\x1b[?25l');
    }
    if (blinking !== undefined) {
      codes.push(blinking ? '\x1b[?12h' : '\x1b[?12l');
    }
  }
  return codes.join('');
}
