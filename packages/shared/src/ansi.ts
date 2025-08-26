import type { DeepPartial } from './helper';

export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  blinking: boolean;
}
export interface AnsiDisplayState {
  cursor: CursorState;
  altScreen: boolean;
}
export type CursorJson = CursorState;
export type AnsiDisplayJson = AnsiDisplayState;

export interface BufferState {
  cursor: CursorJson;
  buffer: string[];
}

export function displayStateToAnsi(
  state: DeepPartial<AnsiDisplayState>
): string {
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
