import React, { useMemo } from 'react';
import { StyleSheet, Text } from './base_components';
import type { IBufferLine, IBufferCell } from '@xterm/headless';

const styles = StyleSheet.create({
  line: {
    width: 'calc(var(--term-columns) * var(--term-cell-width) * 1px)',
    height: 'calc(var(--term-cell-height) * 1px)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    color: 'white',
    whiteSpace: 'pre',
    overflow: 'hidden',
    flexDirection: 'row',
  },
});

export interface LineProps {
  line: IBufferLine;
  version: number;
}
export const Line = React.memo(
  function Line(props: LineProps) {
    const spans = useMemo(() => _lineToSpans(props.line), [props.line]);
    return <Text style={styles.line}>{spans.length > 0 ? spans : ' '}</Text>;
  },
  (old_props, new_props) => old_props.version === new_props.version
);

export function EmptyLine() {
  return <Text style={styles.line}>{' ' /*space */}</Text>;
}

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
function _colorToCSS(colorMode: number, color: number): string {
  if (colorMode === 0) {
    return '';
  }
  if (colorMode === 1) {
    if (color < 8) {
      const colors = [
        '#000000',
        '#800000',
        '#008000',
        '#808000',
        '#000080',
        '#800080',
        '#008080',
        '#c0c0c0',
      ];
      return colors[color] ?? '';
    } else if (color < 16) {
      const colors = [
        '#808080',
        '#ff0000',
        '#00ff00',
        '#ffff00',
        '#0000ff',
        '#ff00ff',
        '#00ffff',
        '#ffffff',
      ];
      return colors[color - 8] ?? '';
    } else {
      return `var(--xterm-color-${color})`;
    }
  } else if (colorMode === 2) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgb(${r},${g},${b})`;
  }
  return '';
}
function _getSpanStyle(state: ColorState): React.CSSProperties {
  const style: React.CSSProperties = {};

  const fgColor = _colorToCSS(state.fgColorMode, state.fgColor);
  const bgColor = _colorToCSS(state.bgColorMode, state.bgColor);

  if (state.inverse) {
    if (fgColor) {
      style.backgroundColor = fgColor;
    }
    if (bgColor) {
      style.color = bgColor;
    }
    if (!fgColor && !bgColor) {
      style.backgroundColor = '#ffffff';
      style.color = '#000000';
    }
    if (fgColor && !bgColor) {
      style.color = '#000000';
    }
    if (!fgColor && bgColor) {
      style.backgroundColor = '#ffffff';
    }
  } else {
    if (fgColor) {
      style.color = fgColor;
    }
    if (bgColor) {
      style.backgroundColor = bgColor;
    }
  }

  if (state.bold) {
    style.fontWeight = 'bold';
  }
  if (state.italic) {
    style.fontStyle = 'italic';
  }
  if (state.dim) {
    style.opacity = 0.5;
  }

  const decorations = [];
  if (state.underline) {
    decorations.push('underline');
  }
  if (state.strikethrough) {
    decorations.push('line-through');
  }
  if (state.overline) {
    decorations.push('overline');
  }
  if (decorations.length) {
    style.textDecoration = decorations.join(' ');
  }

  if (state.blink) {
    style.animation = 'blink 1s infinite';
  }
  if (state.invisible) {
    style.visibility = 'hidden';
  }

  return style;
}
function _lineToSpans(line: IBufferLine): React.ReactNode[] {
  if (line.length === 0) {
    return [];
  }
  let lastNonSpaceIndex = -1;
  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    const raw_chars = cell?.getChars() ?? '';
    const chars = raw_chars.length > 0 ? raw_chars : ' ';
    const bgColorMode = cell?.getBgColorMode() ?? 0;
    const isInverse = cell?.isInverse() ?? 0;

    if (chars !== ' ' || bgColorMode !== 0 || isInverse !== 0) {
      lastNonSpaceIndex = i;
    }
  }

  if (lastNonSpaceIndex === -1) {
    return [];
  }

  const spans: React.ReactNode[] = [];
  let currentState: ColorState | null = null;
  let currentText = '';
  let spanKey = 0;

  function _flushSpan() {
    if (currentText) {
      const style = currentState ? _getSpanStyle(currentState) : {};
      spans.push(
        <span key={spanKey++} style={style}>
          {currentText}
        </span>
      );
      currentText = '';
    }
  }

  for (let i = 0; i <= lastNonSpaceIndex; i++) {
    const cell = line.getCell(i);
    const raw_chars = cell?.getChars() ?? '';
    const chars = raw_chars.length > 0 ? raw_chars : ' ';
    const cellState = cell ? _getCellColorState(cell) : null;

    if (
      !currentState ||
      !cellState ||
      !_colorStatesEqual(currentState, cellState)
    ) {
      _flushSpan();
      currentState = cellState;
    }

    currentText += chars;
  }

  _flushSpan();
  return spans;
}
