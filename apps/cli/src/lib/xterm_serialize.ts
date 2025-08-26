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
function _createDefaultColorState(): ColorState {
  return {
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
}
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

function _generateColorTransition(from: ColorState, to: ColorState): string {
  if (_colorStatesEqual(from, to)) {
    return '';
  }

  const sequences: string[] = [];

  const needs_reset =
    (to.fgColorMode === 0 && from.fgColorMode !== 0) ||
    (to.bgColorMode === 0 && from.bgColorMode !== 0) ||
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
    from = _createDefaultColorState();
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
    if (to.fgColorMode === 0) {
      sequences.push('\x1b[39m');
    } else if (to.fgColorMode === 1) {
      if (to.fgColor < 8) {
        sequences.push(`\x1b[${30 + to.fgColor}m`);
      } else if (to.fgColor < 16) {
        sequences.push(`\x1b[${90 + (to.fgColor - 8)}m`);
      } else {
        sequences.push(`\x1b[38;5;${to.fgColor}m`);
      }
    } else if (to.fgColorMode === 2) {
      const r = (to.fgColor >> 16) & 0xff;
      const g = (to.fgColor >> 8) & 0xff;
      const b = to.fgColor & 0xff;
      sequences.push(`\x1b[38;2;${r};${g};${b}m`);
    }
  }

  if (to.bgColorMode !== from.bgColorMode || to.bgColor !== from.bgColor) {
    if (to.bgColorMode === 0) {
      sequences.push('\x1b[49m');
    } else if (to.bgColorMode === 1) {
      if (to.bgColor < 8) {
        sequences.push(`\x1b[${40 + to.bgColor}m`);
      } else if (to.bgColor < 16) {
        sequences.push(`\x1b[${100 + (to.bgColor - 8)}m`);
      } else {
        sequences.push(`\x1b[48;5;${to.bgColor}m`);
      }
    } else if (to.bgColorMode === 2) {
      const r = (to.bgColor >> 16) & 0xff;
      const g = (to.bgColor >> 8) & 0xff;
      const b = to.bgColor & 0xff;
      sequences.push(`\x1b[48;2;${r};${g};${b}m`);
    }
  }
  return sequences.join('');
}
export function lineToString(line: IBufferLine): string {
  if (line.length === 0) {
    return '';
  }

  let result = '';
  let current_state = _createDefaultColorState();
  let last_non_space_index = -1;

  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    if (cell?.getChars().trim() !== '') {
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

    const cell_state = _getCellColorState(cell);
    const transition = _generateColorTransition(current_state, cell_state);

    if (transition) {
      result += transition;
      current_state = cell_state;
    }

    const chars = cell.getChars();
    result += chars || ' ';
  }

  if (!_colorStatesEqual(current_state, _createDefaultColorState())) {
    result += '\x1b[0m';
  }

  return result;
}
