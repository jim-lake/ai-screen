import React, { useSyncExternalStore, useMemo } from 'react';
import { StyleSheet, View, Text } from './base_components';
import { Terminal } from '@xterm/xterm';
import type { IBufferLine, IBufferCell } from '@xterm/xterm';

import { Line, EmptyLine } from './xterm_line';
import { measureCharSize } from '../tools/measure';

const styles = StyleSheet.create({
});

export interface XTermScrollbackProps {
  terminal: Terminal;
}
export default function XTermScrollback(props: XTermScrollbackProps) {
  const { terminal } = props;
  const { rows } = terminal;
  const scroll = useScrollLines(terminal);
  const lines: React.ReactNode[] = [];
  const buffer = terminal.buffer.normal;
  for (let i = scroll - 1 ; i >= 0 ; i--) {
    //console.log("scrollback push:", i);
    const line = buffer.getLine(i);
    lines.push(<Line key={`scroll${i}`} line={line} version={0} />);
  }

  console.log("scrollback:", scroll, lines.length, buffer.baseY);
  return lines;
}

function useScrollLines(terminal: Terminal) {
  const _get = useCallback(() => {
    return terminal.buffer.normal.baseY;
  }, [terminal]);
  const _sub = useCallback((callback: () => void) => {
    const obj = terminal.onScroll((lines: number) => {
      console.log("onScroll:", lines);
      callback();
    });
    return () => {
      obj.dispose();
    };
  },
    [terminal]
  );
  return useSyncExternalStore(_sub, _get);
}