import React, { useSyncExternalStore, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';

import { Line, EmptyLine } from './xterm_line';

export interface XTermScrollbackProps {
  terminal: Terminal;
}
export default function XTermScrollback(props: XTermScrollbackProps) {
  const { terminal } = props;
  const scroll = useScrollLines(terminal);
  const lines: React.ReactNode[] = [];
  const buffer = terminal.buffer.normal;
  for (let i = scroll - 1; i >= 0; i--) {
    const line = buffer.getLine(i);
    if (line) {
      lines.push(<Line key={`scroll${i}`} line={line} version={0} />);
    } else {
      lines.push(<EmptyLine key={`scroll${i}`} />);
    }
  }

  return lines;
}

function useScrollLines(terminal: Terminal) {
  const _get = useCallback(() => {
    return terminal.buffer.normal.baseY;
  }, [terminal]);
  const _sub = useCallback(
    (callback: () => void) => {
      const obj = terminal.onScroll(() => {
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
