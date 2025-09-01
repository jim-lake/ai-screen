import React, {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { StyleSheet, View } from './base_components';
import { Terminal } from '@xterm/headless';

import { Line, EmptyLine } from './xterm_line';
import XTermScrollback from './xterm_scrollback';
import { measureCharSize } from '../tools/measure';
import { write } from '../stores/connect_store';

import type { IEvent } from '@xterm/headless';
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
    caretColor: 'transparent',
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
  _core: { _inputHandler: { onRequestRefreshRows: IEvent<number, number> } };
}

export interface XTermReactRendererProps {
  terminal: Terminal;
  session: SessionJson;
  fontFamily: string;
  fontSize: number;
}
export default function XTermReactRenderer(props: XTermReactRendererProps) {
  const { terminal, fontFamily, fontSize } = props;
  const ref = useRef<HTMLDivElement>(null);
  const row_version_list = useDirtyRows(terminal) ?? [];
  const { rows } = terminal;
  const columns = terminal.cols;
  const lineHeight = 1.0;

  useEffect(() => {
    if (ref.current) {
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
    e.preventDefault();
    const data = _translateKeyToData(e);
    if (data) {
      write({ session: props.session, data });
    }
  }
  function _onInput(e: React.SyntheticEvent<HTMLDivElement, InputEvent>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent.data && !e.nativeEvent.isComposing) {
      write({ session: props.session, data: e.nativeEvent.data });
    }
    return false;
  }
  function _onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const data = e.clipboardData.getData('text/plain');
    if (data) {
      write({ session: props.session, data });
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
      contentEditable
      spellCheck={false}
      autoCorrect='off'
      autoCapitalize='off'
      autoComplete='off'
      suppressContentEditableWarning
      onFocus={_onFocus}
      onKeyDown={_onKeyDown}
      onBeforeInput={_onInput}
      onInput={_onInput}
      onPaste={_onPaste}
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
const g_dirtyMap = new Map<Terminal, number[]>();
function useDirtyRows(terminal: Terminal) {
  const _get = useCallback(() => {
    return g_dirtyMap.get(terminal);
  }, [terminal]);
  const _sub = useCallback(
    (callback: () => void) => {
      const obj = (
        terminal as TerminalCore
      )._core._inputHandler.onRequestRefreshRows(
        (start: number, end: number) => {
          const old = g_dirtyMap.get(terminal);
          const new_list = old ? old.slice() : [];
          for (let i = start; i <= end; i++) {
            new_list[i] = (new_list[i] ?? 0) + 1;
          }
          g_dirtyMap.set(terminal, new_list);
          callback();
        }
      );
      return () => {
        obj.dispose();
      };
    },
    [terminal]
  );
  return useSyncExternalStore(_sub, _get);
}
function _translateKeyToData(e: React.KeyboardEvent<HTMLDivElement>): string {
  const { key, ctrlKey, altKey } = e;
  if (key === 'ArrowLeft') {
    return '\x1b[D';
  }
  if (key === 'ArrowRight') {
    return '\x1b[C';
  }
  if (key === 'ArrowUp') {
    return '\x1b[A';
  }
  if (key === 'ArrowDown') {
    return '\x1b[B';
  }
  if (key === 'Backspace') {
    return '\x7f';
  }
  if (key === 'Enter') {
    return '\r';
  }
  if (key === 'Tab') {
    return '\t';
  }
  if (key === 'Escape') {
    return '\x1b';
  }
  if (key === 'Insert') {
    return '\x1b[2~';
  }
  if (key === 'Delete') {
    return '\x1b[3~';
  }
  if (key === 'Home') {
    return '\x1b[H';
  }
  if (key === 'End') {
    return '\x1b[F';
  }
  if (key === 'PageUp') {
    return '\x1b[5~';
  }
  if (key === 'PageDown') {
    return '\x1b[6~';
  }
  if (key.startsWith('F') && key.length <= 3) {
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
      return fKeyCodes[fNum - 1] ?? '';
    }
  }
  if (ctrlKey && key.length === 1) {
    const char = key.toLowerCase();
    if (char >= 'a' && char <= 'z') {
      return String.fromCharCode(char.charCodeAt(0) - 96);
    }
    if (char === '[') {
      return '\x1b';
    }
    if (char === ']') {
      return '\x1d';
    }
    if (char === '^') {
      return '\x1e';
    }
    if (char === '_') {
      return '\x1f';
    }
    if (char === '?') {
      return '\x7f';
    }
  }
  if (key.length === 1 && !ctrlKey && !altKey) {
    return key;
  }
  return '';
}
