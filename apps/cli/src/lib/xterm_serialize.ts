import type { IBufferLine, IBufferCell } from '@xterm/headless';

interface ColorState {
  fgColorMode: number;
  fgColor: number;
  bgColorMode: number;
  bgColor: number;
  bold: boolean;
  italic: boolean;
  dim: boolean;
  underline: boolean;
  blink: boolean;
  inverse: boolean;
  invisible: boolean;
  strikethrough: boolean;
  overline: boolean;
}
const DEFAULT_COLOR_STATE: ColorState = {
  fgColorMode: 0,
  fgColor: 0,
  bgColorMode: 0,
  bgColor: 0,
  bold: false,
  italic: false,
  dim: false,
  underline: false,
  blink: false,
  inverse: false,
  invisible: false,
  strikethrough: false,
  overline: false,
};
function _getCellColorState(cell: IBufferCell): ColorState {
  return {
    fgColorMode: cell.getFgColorMode(),
    fgColor: cell.getFgColor(),
    bgColorMode: cell.getBgColorMode(),
    bgColor: cell.getBgColor(),
    bold: !!cell.isBold(),
    italic: !!cell.isItalic(),
    dim: !!cell.isDim(),
    underline: !!cell.isUnderline(),
    blink: !!cell.isBlink(),
    inverse: !!cell.isInverse(),
    invisible: !!cell.isInvisible(),
    strikethrough: !!cell.isStrikethrough(),
    overline: !!cell.isOverline(),
  };
}
function _colorStatesEqual(a: ColorState, b: ColorState): boolean {
  return (
    a.fgColorMode === b.fgColorMode &&
    a.fgColor === b.fgColor &&
    a.bgColorMode === b.bgColorMode &&
    a.bgColor === b.bgColor &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.dim === b.dim &&
    a.underline === b.underline &&
    a.blink === b.blink &&
    a.inverse === b.inverse &&
    a.invisible === b.invisible &&
    a.strikethrough === b.strikethrough &&
    a.overline === b.overline
  );
}
function _generateColorTransition(
  from: ColorState,
  cell: IBufferCell
): [string, ColorState] {
  const to = _getCellColorState(cell);
  if (_colorStatesEqual(from, to)) {
    return ['', from];
  }

  const sequences: string[] = [];

  const needs_reset =
    (!to.bold && from.bold) ||
    (!to.italic && from.italic) ||
    (!to.dim && from.dim) ||
    (!to.underline && from.underline) ||
    (!to.blink && from.blink) ||
    (!to.inverse && from.inverse) ||
    (!to.invisible && from.invisible) ||
    (!to.strikethrough && from.strikethrough) ||
    (!to.overline && from.overline);

  if (needs_reset) {
    sequences.push('\x1b[0m');
    from = DEFAULT_COLOR_STATE;
  }

  if (to.bold && !from.bold) {
    sequences.push('\x1b[1m');
  }
  if (to.italic && !from.italic) {
    sequences.push('\x1b[3m');
  }
  if (to.dim && !from.dim) {
    sequences.push('\x1b[2m');
  }
  if (to.underline && !from.underline) {
    sequences.push('\x1b[4m');
  }
  if (to.blink && !from.blink) {
    sequences.push('\x1b[5m');
  }
  if (to.inverse && !from.inverse) {
    sequences.push('\x1b[7m');
  }
  if (to.invisible && !from.invisible) {
    sequences.push('\x1b[8m');
  }
  if (to.strikethrough && !from.strikethrough) {
    sequences.push('\x1b[9m');
  }
  if (to.overline && !from.overline) {
    sequences.push('\x1b[53m');
  }

  if (to.fgColorMode !== from.fgColorMode || to.fgColor !== from.fgColor) {
    sequences.push(_cellFgToAnsi(cell));
  }
  if (to.bgColorMode !== from.bgColorMode || to.bgColor !== from.bgColor) {
    sequences.push(_cellBgToAnsi(cell));
  }
  return [sequences.join(''), to];
}
export function lineToString(line: IBufferLine): string {
  if (line.length === 0) {
    return '';
  }

  let result = '';
  let current_state = DEFAULT_COLOR_STATE;
  let last_non_space_index = -1;

  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    if (
      cell?.getChars().trim() !== '' ||
      cell.getBgColorMode() !== 0 ||
      cell.isInverse() !== 0
    ) {
      last_non_space_index = i;
    }
  }

  if (last_non_space_index === -1) {
    return '';
  }

  for (let i = 0; i <= last_non_space_index; i++) {
    const cell = line.getCell(i);
    if (!cell) {
      result += ' ';
      continue;
    }
    const [transition, cell_state] = _generateColorTransition(
      current_state,
      cell
    );
    if (transition) {
      result += transition;
      current_state = cell_state;
    }
    const chars = cell.getChars();
    result += chars || ' ';
  }
  if (!_colorStatesEqual(current_state, DEFAULT_COLOR_STATE)) {
    result += '\x1b[0m';
  }

  return result;
}
function _cellFgToAnsi(cell: IBufferCell): string {
  if (cell.isFgDefault()) {
    return '\x1b[39m';
  }
  const fg = cell.getFgColor() >>> 0;
  if (cell.isFgRGB()) {
    const r = (fg >>> 16) & 0xff;
    const g = (fg >>> 8) & 0xff;
    const b = fg & 0xff;
    return `\x1b[38;2;${r};${g};${b}m`;
  }
  if (cell.isFgPalette()) {
    if (fg < 8) {
      return `\x1b[3${fg}m`;
    }
    if (fg < 16) {
      return `\x1b[9${fg - 8}m`;
    }
    return `\x1b[38;5;${fg}m`;
  }
  return '';
}
function _cellBgToAnsi(cell: IBufferCell): string {
  if (cell.isBgDefault()) {
    return '\x1b[49m';
  }
  const bg = cell.getBgColor() >>> 0;
  if (cell.isBgRGB()) {
    const r = (bg >>> 16) & 0xff;
    const g = (bg >>> 8) & 0xff;
    const b = bg & 0xff;
    return `\x1b[48;2;${r};${g};${b}m`;
  }
  if (cell.isBgPalette()) {
    if (bg < 8) {
      return `\x1b[4${bg}m`;
    }
    if (bg < 16) {
      return `\x1b[10${bg - 8}m`;
    }
    return `\x1b[48;5;${bg}m`;
  }
  return '';
}
