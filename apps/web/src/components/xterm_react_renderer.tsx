import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text } from './base_components';
import { Terminal } from '@xterm/xterm';
import type { IBufferLine, IBufferCell } from '@xterm/xterm';

import { useRenderUpdate } from './xterm_react_renderer_addon';
import { measureCharSize } from '../tools/measure';

const styles = StyleSheet.create({
  xtermReactRenderer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 'calc(var(--term-rows) * var(--term-cell-height) * 1px)',
    width: 'calc(var(--term-columns) * var(--term-cell-width) * 1px)',
    fontFamily: 'var(--term-font)',
    fontSize: 'calc(var(--term-font-size) * 1px)',
    lineHeight: 'var(--term-line-height)',
    zIndex: 10,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  rows: {
    width: 'calc(var(--term-columns) * var(--term-cell-width) * 1px)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    flexDirection: 'column',
  },
  row: {
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

interface TerminalCore extends Terminal {
  _core: {
    _keyDown: (event: unknown) => boolean;
    _keyUp: (event: unknown) => boolean;
    _keyPress: (event: unknown) => boolean;
    _inputEvent: (event: unknown) => boolean;
  };
}

export interface XTermReactRendererProps {
  terminal: Terminal;
}

export default function XTermReactRenderer(props: XTermReactRendererProps) {
  const { terminal } = props;
  const ref = useRef<HTMLDivElement>(null);
  const dirty = useRenderUpdate(terminal);
  const { rows } = terminal;
  const columns = terminal.cols;
  const { fontFamily, fontSize, lineHeight } = terminal.options;
  const _term = terminal as TerminalCore;

  useEffect(() => {
    if (ref.current && fontFamily && fontSize && lineHeight) {
      const size = measureCharSize({ fontFamily, fontSize, lineHeight });
      ref.current.style.setProperty('--term-cell-height', String(size.height));
      ref.current.style.setProperty('--term-cell-width', String(size.width));
      ref.current.style.setProperty('--term-font', fontFamily);
      ref.current.style.setProperty('--term-font-size', String(fontSize));
      ref.current.style.setProperty('--term-line-height', String(lineHeight));
      ref.current.style.setProperty('--term-rows', String(rows));
      ref.current.style.setProperty('--term-columns', String(columns));
    }
  }, [rows, columns, fontFamily, fontSize, lineHeight]);

  const lines = useMemo(() => {
    const buffer = terminal.buffer.active;
    const result: React.ReactNode[] = [];
    let i = Math.max(0, buffer.length - rows);

    for (; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        const spans = _lineToSpans(line);
        result.push(
          <Text key={i} style={styles.row}>
            {spans.length > 0 ? spans : ' '}
          </Text>
        );
      } else {
        result.push(
          <Text key={i} style={styles.row}>
            {' '}
          </Text>
        );
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal.buffer.active, rows, dirty]);

  function _onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    return _term._core._keyDown(e.nativeEvent);
  }
  function _onKeyUp(e: React.KeyboardEvent<HTMLDivElement>) {
    return _term._core._keyUp(e.nativeEvent);
  }
  function _onKeyPress(e: React.KeyboardEvent<HTMLDivElement>) {
    return _term._core._keyPress(e.nativeEvent);
  }
  function _onInput(e: React.InputEvent<HTMLDivElement>) {
    return _term._core._inputEvent(e.nativeEvent);
  }
  function _onFocus() {
    //terminal.focus();
  }

  return (
    <View
      getDiv={ref}
      style={styles.xtermReactRenderer}
      tabIndex={0}
      onFocus={_onFocus}
      onKeyDown={_onKeyDown}
      onKeyUp={_onKeyUp}
      onKeyPress={_onKeyPress}
      onInput={_onInput}
      data-testid='terminal-inner'
    >
      <View style={styles.rows}>{lines}</View>
    </View>
  );
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

  // Find the last cell with non-space content or with background color
  let lastNonSpaceIndex = -1;
  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    const raw_chars = cell?.getChars() ?? '';
    const chars = raw_chars.length > 0 ? raw_chars : ' ';
    const hasBgColor = cell?.getBgColorMode() !== 0;

    // Keep if it's not a space, or if it's a space with background color
    if (chars !== ' ' || hasBgColor) {
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
