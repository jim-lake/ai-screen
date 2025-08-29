import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from './base_components';
import { Terminal } from '@xterm/xterm';

import { Line, EmptyLine } from './xterm_line';
import XTermScrollback from './xterm_scrollback';
import { useRowVersion } from './xterm_react_renderer_addon';
import { measureCharSize } from '../tools/measure';

import type { SessionJson } from '@ai-screen/shared';

const styles = StyleSheet.create({
  xtermReactRenderer: {
    minHeight: 'calc(var(--term-rows) * var(--term-cell-height) * 1px)',
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
    flexDirection: 'column-reverse',
  },
  extra: {
    height: 'calc(110vh - (var(--term-rows) * var(--term-cell-height) * 1px))',
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
  session: SessionJson;
}
export default function XTermReactRenderer(props: XTermReactRendererProps) {
  const { terminal } = props;
  const ref = useRef<HTMLDivElement>(null);
  const row_version_list = useRowVersion(terminal) ?? [];
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

  const terminal_lines: React.ReactNode[] = [];
  const buffer = terminal.buffer.active;
  const base_y = terminal.buffer.active.baseY;
  for (let i = rows - 1; i >= 0; i--) {
    const line = buffer.getLine(i + base_y);
    if (line) {
      const version = row_version_list[i] ?? 0;
      terminal_lines.push(<Line key={i} line={line} version={version} />);
    } else {
      terminal_lines.push(<EmptyLine key={i} />);
    }
  }

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
      <View style={styles.rows}>
        {terminal_lines}
        <XTermScrollback terminal={terminal} />
        <View style={styles.extra} />
      </View>
    </View>
  );
}
