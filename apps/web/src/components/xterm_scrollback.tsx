import React, { useSyncExternalStore, useCallback } from 'react';
import { Terminal } from '@xterm/headless';
import { View } from './base_components';

import { Line, EmptyLine, TextLine } from './xterm_line';

import { useScrollbackLength, useLines } from '../stores/scrollback_store';
import { measureCharSize } from '../tools/measure';

import type { SessionJson } from '@ai-screen/shared';

export interface XTermScrollbackProps {
  session: SessionJson;
  terminalId: number;
  terminal: Terminal;
  scrollRef: HTMLDivElement | null;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  containerHeight: number;
}
export default function XTermScrollback(props: XTermScrollbackProps) {
  const { session, terminalId, terminal, scrollRef } = props;
  const { fontFamily, fontSize, lineHeight } = props;
  const { rows } = terminal;
  const size = measureCharSize({ fontFamily, fontSize, lineHeight });
  const viewport_rows = Math.ceil(props.containerHeight / size.height);
  const viewport_overflow = Math.ceil(viewport_rows / 4);
  const scroll_top = useScrollTop(scrollRef) - props.padding;
  const scrollback_rows = useScrollbackLength(session, terminalId, terminal);
  const total_rows = scrollback_rows + rows;

  const bottom_start = Math.max(0, scrollback_rows - viewport_rows);
  const bottom_end = scrollback_rows;
  const viewport_end_row = total_rows - Math.floor(-scroll_top / size.height);

  const viewport_start = Math.max(
    0,
    viewport_end_row - viewport_rows - viewport_overflow
  );
  const viewport_end = viewport_start + viewport_rows + 2 * viewport_overflow;
  const viewport_line_end = Math.min(viewport_end, bottom_start);
  const viewport_line_start = Math.min(viewport_start, viewport_line_end);

  // we render the frame bottom and viewport_rows height at all times
  const bottom_lines = useLines(
    session,
    terminalId,
    terminal,
    bottom_start,
    bottom_end
  );
  const viewport_lines = useLines(
    session,
    terminalId,
    terminal,
    viewport_line_start,
    viewport_line_end
  );

  const viewport_pre_gap = Math.max(0, bottom_start - viewport_line_end);
  const viewport_post_gap = Math.max(0, viewport_line_start);

  const lines: React.ReactNode[] = [];
  for (let i = bottom_lines.length - 1; i >= 0; i--) {
    const obj = bottom_lines[i];
    if (obj?.line) {
      lines.push(<Line key={obj.key} line={obj.line} version={0} />);
    } else if (obj?.text) {
      lines.push(<TextLine key={obj.key} text={obj.text} />);
    } else {
      lines.push(<EmptyLine key={obj?.key ?? ''} />);
    }
  }
  lines.push(<Gap key='viewport-pre-gap' size={viewport_pre_gap} />);
  for (let i = viewport_lines.length - 1; i >= 0; i--) {
    const obj = viewport_lines[i];
    if (obj?.line) {
      lines.push(<Line key={obj.key} line={obj.line} version={0} />);
    } else if (obj?.text) {
      lines.push(<TextLine key={obj.key} text={obj.text} />);
    } else {
      lines.push(<EmptyLine key={obj?.key ?? ''} />);
    }
  }
  lines.push(<Gap key='viewport-post-gap' size={viewport_post_gap} />);
  return lines;
}
interface GapProps {
  size: number;
}
function Gap(props: GapProps) {
  return (
    <View
      style={{ height: `calc(var(--term-cell-height) * ${props.size} * 1px)` }}
    />
  );
}
function useScrollTop(el: HTMLDivElement | null) {
  const _sub = useCallback(
    (callback: () => void) => {
      el?.addEventListener('scroll', callback, { passive: true });
      return () => {
        el?.removeEventListener('scroll', callback);
      };
    },
    [el]
  );
  const _get = useCallback(() => el?.scrollTop ?? 0, [el]);
  return useSyncExternalStore(_sub, _get);
}
