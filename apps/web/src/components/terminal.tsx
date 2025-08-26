import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from './base_components';
import '@xterm/xterm/css/xterm.css';

import {
  connect,
  disconnect,
  resize,
  useTerminal,
} from '../stores/connect_store';
import { useSetting } from '../stores/setting_store';
import { measureCharSize } from '../tools/measure';
import { useComponentSize } from '../tools/component_size';

import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from '../lib/defaults';

import type { StyleInput } from './base_components';
import type { SessionJson } from '@ai-screen/shared';

const TEST_SIZE = 12;
const PADDING = 4;

const styles = StyleSheet.create({
  terminal: {
    flex: 1,
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: '#444',
    overflow: 'hidden',
  },
  scroller: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  scrollerInner: {
    flex: 1,
    //alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    //backgroundColor: 'black',
  },
  inner: { display: 'block', padding: PADDING, backgroundColor: 'black' },
});

export interface TerminalProps {
  style?: StyleInput;
  session: SessionJson;
  zoom: 'SHRINK' | 'EXPAND' | 'FIT';
}
export default function Terminal(props: TerminalProps) {
  const { session, zoom } = props;
  const element_ref = useRef<HTMLDivElement>(null);
  const terminal = useTerminal(session.sessionName);
  const fontFamily = useSetting('fontFamily') ?? DEFAULT_FONT_FAMILY;
  const fontSize = useSetting('fontSize') ?? DEFAULT_FONT_SIZE;
  const [container_ref, container_size] = useComponentSize();
  const [overflow, setOverflow] = useState('hidden');

  useEffect(() => {
    const element = element_ref.current;
    if (element) {
      const terminalOptions = {
        fontFamily,
        fontSize,
        //lineHeight: 1,
      };
      connect({ session, element, terminalOptions });
      return () => {
        disconnect({ session, element });
      };
    }
  }, [session, element_ref, fontFamily, fontSize]);
  useEffect(() => {
    if (session && terminal && container_size) {
      const { rows: old_rows, cols: old_cols } = terminal;
      terminal.options.fontFamily = fontFamily;
      const lineHeight = terminal.options.lineHeight ?? 1.0;
      const char_size = measureCharSize({ fontFamily, fontSize, lineHeight });
      const width_ratio = char_size.width / fontSize;
      const height_ratio = char_size.height / fontSize;
      const avail_width = container_size.width - PADDING * 2;
      const avail_height = container_size.height - PADDING * 2;
      console.log({ avail_width, avail_height });
      console.log('char_size:', char_size);
      console.log('container:', container_size);
      if (zoom === 'SHRINK') {
        const size_width = avail_width / old_cols / width_ratio;
        const size_height = avail_height / old_rows / height_ratio;
        console.log({ avail_width, avail_height });
        console.log({ size_width, size_height });
        let new_font_size = Math.floor(Math.min(size_width, size_height));
        const test_size = measureCharSize({
          fontFamily,
          fontSize: new_font_size,
          lineHeight,
        });
        const delta_w = avail_width - test_size.width * old_cols;
        const delta_h = avail_height - test_size.height * old_rows;
        console.log({ delta_h, delta_w });
        if (delta_h < 0 || delta_w < 0) {
          new_font_size--;
        }

        console.log('SHRINK:', new_font_size);
        terminal.options.fontSize = new_font_size;
        setOverflow('hidden');
      } else if (zoom === 'FIT') {
        terminal.options.fontSize = fontSize;
        const new_columns = Math.floor(avail_width / char_size.width);
        const new_rows = Math.floor(avail_height / char_size.height);
        const delta_w = avail_width - char_size.width * new_columns;
        const delta_h = avail_height - char_size.height * new_rows;
        console.log({ delta_h, delta_w });
        console.log('FIT:', { new_columns, new_rows });
        resize({ session, columns: new_columns, rows: new_rows });
        setOverflow('hidden');
      } else if (zoom === 'EXPAND') {
        terminal.options.fontSize = fontSize;
        const delta_w = avail_width - char_size.width * old_cols;
        const delta_h = avail_height - char_size.height * old_rows;
        const overflow_x = delta_w < 0 ? 'scroll' : 'hidden';
        const overflow_y = delta_h < 0 ? 'scroll' : 'hidden';
        setOverflow(overflow_x + ' ' + overflow_y);
      }
    }
    window.terminal = terminal;
  }, [terminal, zoom, container_size, fontFamily, fontSize, setOverflow]);

  console.log('render:', terminal?.options, zoom, overflow);
  return (
    <View getDiv={container_ref} style={[styles.terminal, props.style]}>
      <ScrollView
        style={[styles.scroller, { overflow }]}
        contentContainerStyle={styles.scrollerInner}
      >
        <View style={styles.inner} getDiv={element_ref} />
      </ScrollView>
    </View>
  );
}
