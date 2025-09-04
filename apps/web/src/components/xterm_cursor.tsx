import { useCallback, useRef, useSyncExternalStore } from 'react';
import { Terminal } from '@xterm/headless';
import { StyleSheet, View } from './base_components';

const styles = StyleSheet.create({
  cursor: {
    position: 'absolute',
    width: 'calc(var(--term-cell-width) * 1px)',
    height: 'calc(var(--term-cell-height) * 1px)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
export interface XTermCursorProps {
  terminal: Terminal;
  isFocused: boolean;
}
export default function XTermCursor(props: XTermCursorProps) {
  const { x, y } = useCursorPosition(props.terminal);
  const extra = {
    left: `calc(var(--term-cell-width) * ${x} * 1px)`,
    bottom: `calc(var(--term-cell-height) * calc(var(--term-rows) - ${y} - 1) * 1px)`,
  };
  return props.isFocused ? <View style={[styles.cursor, extra]} /> : null;
}

interface Position {
  x: number;
  y: number;
}
function useCursorPosition(terminal: Terminal): Position {
  const ref = useRef<Position | null>(null);
  const _get = useCallback(() => {
    const pos = {
      x: terminal.buffer.active.cursorX,
      y: terminal.buffer.active.cursorY,
    };
    if (!_cursorEqual(ref.current, pos)) {
      ref.current = pos;
    }
    return ref.current;
  }, [terminal]);
  const _sub = useCallback(
    (callback: () => void) => {
      const obj = terminal.onCursorMove(() => {
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
function _cursorEqual(a: Position | null, b: Position) {
  return a !== null && a.x === b.x && a.y === b.y;
}
