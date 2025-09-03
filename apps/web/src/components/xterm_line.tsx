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
    return <Text style={styles.line}>{_textToSpans(props.text)}</Text>;
  },
  (old_props, new_props) => old_props.text === new_props.text
);

interface ColorState {
  isFgDefault: boolean;
  isBgDefault: boolean;
  isFgPalette: boolean;
  isBgPalette: boolean;
  fgColor: number;
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
  isFgPalette: false,
  isBgPalette: false,
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
    isFgPalette: cell.isFgPalette(),
    isBgPalette: cell.isBgPalette(),
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
    (a.isFgPalette === b.isFgPalette && a.fgColor === b.fgColor);
  const bg_equal =
    (a.isBgDefault && b.isBgDefault) ||
    (a.isBgPalette === b.isBgPalette && a.bgColor === b.bgColor);
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
function _getSpanStyle(state: ColorState): React.CSSProperties | undefined {
  if (_colorStatesEqual(state, DEFAULT_STATE)) {
    return undefined;
  }
  const style: React.CSSProperties = {};

  if (state.inverse) {
    style.backgroundColor = state.isFgDefault
      ? 'var(--ansi-default-fg)'
      : _colorToCSS(state.isFgPalette, state.fgColor);
    style.color = state.isBgDefault
      ? 'var(--ansi-default-bg)'
      : _colorToCSS(state.isBgPalette, state.bgColor);
  } else {
    if (!state.isFgDefault) {
      style.color = _colorToCSS(state.isFgPalette, state.fgColor);
    }
    if (!state.isBgDefault) {
      style.backgroundColor = _colorToCSS(state.isBgPalette, state.bgColor);
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
  let current_state: ColorState = { ...DEFAULT_STATE };
  let current_text = '';
  let span_key = 0;
  let span_style: React.CSSProperties | undefined = undefined;

  for (let i = 0; i <= last_non_space_index; i++) {
    const cell = line.getCell(i);
    if (cell) {
      const raw_chars = cell.getChars();
      const chars = raw_chars.length > 0 ? raw_chars : ' ';
      const new_state = _getCellColorState(cell);
      if (!_colorStatesEqual(current_state, new_state)) {
        if (current_text.length > 0) {
          span_list.push(
            <span key={String(span_key++)} style={span_style}>
              {current_text}
            </span>
          );
          current_text = '';
        }
        span_style = _getSpanStyle(new_state);
        current_state = new_state;
      }
      current_text += chars;
    }
  }
  if (current_text.length > 0) {
    if (span_key === 0 && !span_style) {
      span_list.push(current_text);
    } else {
      span_list.push(
        <span key={String(span_key++)} style={span_style}>
          {current_text}
        </span>
      );
    }
  }
  return span_list;
}
const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;
function _textToSpans(input: string): React.ReactNode[] {
  if (input.length === 0) {
    return [];
  }

  const span_list: React.ReactNode[] = [];
  let current_state: ColorState = { ...DEFAULT_STATE };
  let current_text = '';
  let span_key = 0;

  let last_index = 0;

  for (const match of input.matchAll(ANSI_REGEX)) {
    const { index } = match;

    if (index > last_index) {
      current_text += input.slice(last_index, index);
    }

    const new_state = { ...current_state };
    const codes = (match[1] ?? '')
      .split(';')
      .map((s) => (s === '' ? 0 : parseInt(s, 10)));

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      switch (code) {
        case undefined:
          break;
        case 0:
          Object.assign(new_state, { ...DEFAULT_STATE });
          break;
        case 1:
          new_state.bold = true;
          break;
        case 3:
          new_state.italic = true;
          break;
        case 4:
          new_state.underline = true;
          break;
        case 7:
          new_state.inverse = true;
          break;
        case 22:
          new_state.bold = false;
          break;
        case 23:
          new_state.italic = false;
          break;
        case 24:
          new_state.underline = false;
          break;
        case 27:
          new_state.inverse = false;
          break;
        case 39:
          new_state.isFgDefault = true;
          new_state.isFgPalette = false;
          new_state.fgColor = -1;
          break;
        case 49:
          new_state.isBgDefault = true;
          new_state.isBgPalette = false;
          new_state.bgColor = -1;
          break;
        default:
          if (30 <= code && code <= 37) {
            new_state.isFgDefault = false;
            new_state.isFgPalette = true;
            new_state.fgColor = code - 30;
          } else if (90 <= code && code <= 97) {
            new_state.isFgDefault = false;
            new_state.isFgPalette = true;
            new_state.fgColor = code - 90 + 8;
          } else if (40 <= code && code <= 47) {
            new_state.isBgDefault = false;
            new_state.isBgPalette = true;
            new_state.bgColor = code - 40;
          } else if (100 <= code && code <= 107) {
            new_state.isBgDefault = false;
            new_state.isBgPalette = true;
            new_state.bgColor = code - 100 + 8;
          } else if (code === 38) {
            if (codes[i + 1] === 5) {
              new_state.isFgDefault = false;
              new_state.isFgPalette = true;
              new_state.fgColor = codes[i + 2] ?? 0;
              i += 2;
            } else if (codes[i + 1] === 2) {
              const r = codes[i + 2] ?? 0;
              const g = codes[i + 3] ?? 0;
              const b = codes[i + 4] ?? 0;
              new_state.isFgDefault = false;
              new_state.isFgPalette = false;
              new_state.fgColor = (r << 16) + (g << 8) + b;
              i += 4;
            }
          } else if (code === 48) {
            if (codes[i + 1] === 5) {
              new_state.isBgDefault = false;
              new_state.isBgPalette = true;
              new_state.bgColor = codes[i + 2] ?? 0;
              i += 2;
            } else if (codes[i + 1] === 2) {
              const r = codes[i + 2] ?? 0;
              const g = codes[i + 3] ?? 0;
              const b = codes[i + 4] ?? 0;
              new_state.isBgDefault = false;
              new_state.isBgPalette = false;
              new_state.bgColor = (r << 16) + (g << 8) + b;
              i += 4;
            }
          }
          break;
      }
    }
    if (!_colorStatesEqual(current_state, new_state)) {
      if (current_text.length > 0) {
        const style = _getSpanStyle(current_state);
        span_list.push(
          <span key={String(span_key++)} style={style}>
            {current_text}
          </span>
        );
        current_text = '';
      }
      current_state = new_state;
    }
    last_index = index + match[0].length;
  }

  if (last_index < input.length) {
    current_text += input.slice(last_index);
  }
  if (current_text.length > 0) {
    const style = _getSpanStyle(current_state);
    if (span_key === 0 && !style) {
      span_list.push(current_text);
    } else {
      span_list.push(
        <span key={String(span_key)} style={style}>
          {current_text}
        </span>
      );
    }
  }
  return span_list;
}
