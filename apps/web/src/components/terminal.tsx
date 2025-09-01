import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from './base_components';
import XTermReactRenderer from './xterm_react_renderer';

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
    overflowX: 'hidden',
    overflowY: 'scroll',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  scrollerInner: {
    //flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'flex-start',
    //overflow: 'hidden',
  },
  inner: {
    display: 'block',
    padding: PADDING,
    backgroundColor: 'black',
    position: 'relative',
  },
  reactRenderer: { position: 'absolute', top: PADDING, left: PADDING },
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
  const fontFamily = useSetting('fontFamily', 'string') ?? DEFAULT_FONT_FAMILY;
  const settingSize = useSetting('fontSize', 'number') ?? DEFAULT_FONT_SIZE;
  const [fontSize, setFontSize] = useState(settingSize);
  const [container_ref, container_size] = useComponentSize<HTMLDivElement>();
  const [overflow_x, setOverflowX] = useState('hidden');

  useEffect(() => {
    connect({ session, terminalOptions: {} });
    return () => {
      disconnect({ session });
    };
  }, [session, element_ref]);

  useEffect(() => {
    if (terminal && container_size) {
      const { rows: old_rows, cols: old_cols } = terminal;
      const lineHeight = 1.0;
      const char_size = measureCharSize({
        fontFamily,
        fontSize: settingSize,
        lineHeight,
      });
      const width_ratio = char_size.width / fontSize;
      const height_ratio = char_size.height / fontSize;
      const avail_width = container_size.width - PADDING * 2;
      const avail_height = container_size.height - PADDING * 2;

      if (zoom === 'SHRINK') {
        const size_width = avail_width / old_cols / width_ratio;
        const size_height = avail_height / old_rows / height_ratio;
        let new_font_size = Math.floor(Math.min(size_width, size_height));
        const test_size = measureCharSize({
          fontFamily,
          fontSize: new_font_size,
          lineHeight,
        });
        const delta_w = avail_width - test_size.width * old_cols;
        const delta_h = avail_height - test_size.height * old_rows;
        if (delta_h < 0 || delta_w < 0) {
          new_font_size--;
        }

        setFontSize(new_font_size);
        setOverflowX('hidden');
      } else if (zoom === 'FIT') {
        const new_columns = Math.floor(avail_width / char_size.width);
        const new_rows = Math.floor(avail_height / char_size.height);
        resize({ session, columns: new_columns, rows: new_rows });
        setFontSize(settingSize);
        setOverflowX('hidden');
      } else {
        // zoom === 'EXPAND'
        const delta_w = avail_width - char_size.width * old_cols;
        const newOverflowX = delta_w < 0 ? 'scroll' : 'hidden';
        setFontSize(settingSize);
        setOverflowX(newOverflowX);
      }
    }
  }, [
    terminal,
    zoom,
    container_size,
    fontFamily,
    fontSize,
    settingSize,
    setOverflowX,
    session,
  ]);

  return (
    <View getDiv={container_ref} style={[styles.terminal, props.style]}>
      <ScrollView
        style={[styles.scroller, { overflowX: overflow_x }]}
        contentContainerStyle={styles.scrollerInner}
      >
        {terminal ? (
          <XTermReactRenderer
            terminal={terminal}
            session={session}
            fontFamily={fontFamily}
            fontSize={fontSize}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
