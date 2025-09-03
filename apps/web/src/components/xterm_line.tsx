/* eslint-disable no-control-regex */
import React, { useMemo } from 'react';
import { StyleSheet, Text } from './base_components';
import type { IBufferLine, IBufferCell } from '@xterm/headless';

import '../css/ansi.css';

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
export interface TextLineProps {
  text: string;
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
export const TextLine = React.memo(
  function TextLine(props: TextLineProps) {
    return (
      <Text style={styles.line}>
        {props.text.replace(/\x1B\[[0-9;]*m/g, '')}
      </Text>
    );
  },
  (old_props, new_props) => old_props.text === new_props.text
);

interface ColorState {
  isFgDefault: boolean;
  isBgDefault: boolean;
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
const DEFAULT_STATE: ColorState = {
  isFgDefault: true,
  isBgDefault: true,
  fgColorMode: 0,
  bgColorMode: 0,
  fgColor: -1,
  bgColor: -1,
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
    isFgDefault: cell.isFgDefault(),
    isBgDefault: cell.isBgDefault(),
    fgColorMode: cell.getFgColorMode(),
    bgColorMode: cell.getBgColorMode(),
    fgColor: cell.getFgColor(),
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
  const fg_equal =
    (a.isFgDefault && b.isFgDefault) ||
    (a.fgColorMode === b.fgColorMode && a.fgColor === b.fgColor);
  const bg_equal =
    (a.isBgDefault && b.isBgDefault) ||
    (a.bgColorMode === b.bgColorMode && a.bgColor === b.bgColor);
  return (
    fg_equal &&
    bg_equal &&
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
const PALETTE16_COLORS = [
  'var(--ansi-black)',
  'var(--ansi-red)',
  'var(--ansi-green)',
  'var(--ansi-yellow)',
  'var(--ansi-blue)',
  'var(--ansi-magenta)',
  'var(--ansi-cyan)',
  'var(--ansi-white)',
  'var(--ansi-bright-black)',
  'var(--ansi-bright-red)',
  'var(--ansi-bright-green)',
  'var(--ansi-bright-yellow)',
  'var(--ansi-bright-blue)',
  'var(--ansi-bright-magenta)',
  'var(--ansi-bright-cyan)',
  'var(--ansi-bright-white)',
];
function _colorToCSS(is_palette: boolean, color: number): string {
  if (is_palette) {
    if (color < 16) {
      return PALETTE16_COLORS[color] ?? '';
    } else if (color >= 232) {
      const level = 8 + 10 * (color - 232);
      return `rgb(${level},${level},${level})`;
    } else {
      const r = Math.floor((color - 16) / 36);
      const g = Math.floor((color - 16) / 6) % 6;
      const b = (color - 16) % 6;
      return `rgb(${r * 51},${g * 51},${b * 51})`;
    }
  } else {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgb(${r},${g},${b})`;
  }
}
function _getSpanStyle(
  state: ColorState,
  cell: IBufferCell
): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (state.inverse) {
    style.backgroundColor = cell.isFgDefault()
      ? 'var(--ansi-default-fg)'
      : _colorToCSS(cell.isFgPalette(), state.fgColor);
    style.color = cell.isBgDefault()
      ? 'var(--ansi-default-bg)'
      : _colorToCSS(cell.isBgPalette(), state.bgColor);
  } else {
    if (!cell.isFgDefault()) {
      style.color = _colorToCSS(cell.isFgPalette(), state.fgColor);
    }
    if (!cell.isBgDefault()) {
      style.backgroundColor = _colorToCSS(cell.isBgPalette(), state.bgColor);
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
  let last_non_space_index = -1;
  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    const raw_chars = cell?.getChars() ?? '';
    const chars = raw_chars.length > 0 ? raw_chars : ' ';
    const is_bg_default = cell?.isBgDefault() ?? true;
    const isInverse = cell?.isInverse() ?? 0;

    if (chars !== ' ' || !is_bg_default || isInverse !== 0) {
      last_non_space_index = i;
    }
  }

  if (last_non_space_index === -1) {
    return [];
  }

  const span_list: React.ReactNode[] = [];
  let current_state: ColorState = DEFAULT_STATE;
  let current_text = '';
  let span_key = 0;
  let span_style: React.CSSProperties | null = null;

  for (let i = 0; i <= last_non_space_index; i++) {
    const cell = line.getCell(i);
    if (cell) {
      const raw_chars = cell.getChars();
      const chars = raw_chars.length > 0 ? raw_chars : ' ';
      const new_state = _getCellColorState(cell);
      if (!_colorStatesEqual(current_state, new_state)) {
        if (current_text.length > 0) {
          span_list.push(
            <span key={String(span_key++)} style={span_style ?? undefined}>
              {current_text}
            </span>
          );
          current_text = '';
        }
        span_style = _getSpanStyle(new_state, cell);
        current_state = new_state;
      }
      current_text += chars;
    }
  }
  if (current_text.length > 0) {
    if (span_key === 0 && span_style === null) {
      span_list.push(current_text);
    } else {
      span_list.push(
        <span key={String(span_key++)} style={span_style ?? undefined}>
          {current_text}
        </span>
      );
    }
  }
  return span_list;
}
