import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from './base_components';
import { Terminal } from '@xterm/xterm';

import { useRenderUpdate } from './xterm_react_renderer_addon';
import { measureCharSize } from '../tools/measure';

const styles = StyleSheet.create({
  xtermReactRenderer: {
    position: 'relative',
    height: 'calc(var(--term-rows) * var(--term-cell-height) * 1px)',
    width: 'calc(var(--term-columns) * var(--term-cell-width) * 1px)',
    fontFamily: 'var(--term-font)',
    fontSize: 'calc(var(--term-font-size) * 1px)',
    lineHeight: 'var(--term-line-height)',
    pointerEvents: 'none',
    zIndex: 10,
    flexDirection: 'column',
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cursor: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    color: '#000000',
    zIndex: 1,
    pointerEvents: 'none',
  },
  selection: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  columnSelection: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
    pointerEvents: 'none',
    zIndex: 5,
  },
});

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
  console.log('render:', dirty);

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

  const lines: React.ReactNode[] = [];

  const buffer = terminal.buffer.active;
  let i = Math.max(0, buffer.length - rows);
  for (; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    lines.push(
      <Text key={i} style={styles.row}>
        {line?.translateToString() ?? ''}
      </Text>
    );
  }
  return (
    <View getDiv={ref} style={styles.xtermReactRenderer}>
      <View style={styles.rows}>{lines}</View>
    </View>
  );
}
