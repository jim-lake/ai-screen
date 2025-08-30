import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from './base_components';
import { Terminal } from '@xterm/xterm';

import { Line, EmptyLine } from './xterm_line';
import XTermScrollback from './xterm_scrollback';
import { useRowVersion } from './xterm_react_renderer_addon';
import { measureCharSize } from '../tools/measure';
import { write } from '../stores/connect_store';

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
    const { key, ctrlKey, altKey } = e;
    let data = '';

    // Handle special keys
    if (key === 'ArrowLeft') {
      data = '\x1b[D';
    } else if (key === 'ArrowRight') {
      data = '\x1b[C';
    } else if (key === 'ArrowUp') {
      data = '\x1b[A';
    } else if (key === 'ArrowDown') {
      data = '\x1b[B';
    } else if (key === 'Backspace') {
      data = '\x7f';
    } else if (key === 'Enter') {
      data = '\r';
    } else if (key === 'Tab') {
      data = '\t';
    } else if (key === 'Escape') {
      data = '\x1b';
    } else if (key === 'Insert') {
      data = '\x1b[2~';
    } else if (key === 'Delete') {
      data = '\x1b[3~';
    } else if (key === 'Home') {
      data = '\x1b[H';
    } else if (key === 'End') {
      data = '\x1b[F';
    } else if (key === 'PageUp') {
      data = '\x1b[5~';
    } else if (key === 'PageDown') {
      data = '\x1b[6~';
    } else if (key.startsWith('F') && key.length <= 3) {
      // Function keys F1-F12
      const fNum = parseInt(key.slice(1));
      if (fNum >= 1 && fNum <= 12) {
        const fKeyCodes = [
          '\x1bOP',
          '\x1bOQ',
          '\x1bOR',
          '\x1bOS', // F1-F4
          '\x1b[15~',
          '\x1b[17~',
          '\x1b[18~',
          '\x1b[19~', // F5-F8
          '\x1b[20~',
          '\x1b[21~',
          '\x1b[23~',
          '\x1b[24~', // F9-F12
        ];
        const fKeyCode = fKeyCodes[fNum - 1];
        if (fKeyCode) {
          data = fKeyCode;
        }
      }
    } else if (ctrlKey && key.length === 1) {
      // Handle Ctrl+key combinations including []^_?
      const char = key.toLowerCase();
      if (char >= 'a' && char <= 'z') {
        data = String.fromCharCode(char.charCodeAt(0) - 96);
      } else if (char === '[') {
        data = '\x1b';
      } else if (char === ']') {
        data = '\x1d';
      } else if (char === '^') {
        data = '\x1e';
      } else if (char === '_') {
        data = '\x1f';
      } else if (char === '?') {
        data = '\x7f';
      }
    } else if (key.length === 1 && !ctrlKey && !altKey) {
      // Regular printable characters
      data = key;
    }

    if (data) {
      write({ session: props.session, data });
      e.preventDefault();
    }
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
