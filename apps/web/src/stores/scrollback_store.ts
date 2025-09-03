import { useCallback, useRef, useSyncExternalStore } from 'react';
import EventEmitter from 'events';
import { Terminal } from '@xterm/headless';

import Api from '../tools/api';
import { herd } from '../tools/util';
import { errorLog } from '../tools/log';

import type { IBufferLine } from '@xterm/headless';
import type { ScrollbackJson, SessionJson } from '@ai-screen/shared';

const g_scrollbackStartMap = new Map<number, number>();
const g_scrollbackLinesMap = new Map<number, string[]>();

const g_eventEmitter = new EventEmitter();
function _emit(sessionName: string) {
  g_eventEmitter.emit(sessionName);
}
function _getLine(terminalId: number, row_index: number): string | undefined {
  const list = g_scrollbackLinesMap.get(terminalId);
  return list?.[row_index];
}
export function setScrollback(
  _sessionName: string,
  terminalId: number,
  scrollbackLines: number
) {
  g_scrollbackStartMap.set(terminalId, scrollbackLines);
}
export function useScrollbackLength(
  _session: SessionJson,
  terminalId: number,
  terminal: Terminal
) {
  const _get = useCallback(() => {
    const start = g_scrollbackStartMap.get(terminalId) ?? 0;
    return terminal.buffer.normal.baseY + start;
  }, [terminalId, terminal]);
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
interface Line {
  key: string;
  line?: IBufferLine;
  text?: string;
}
export function useLines(
  session: SessionJson,
  terminalId: number,
  terminal: Terminal,
  start: number,
  end: number
): Line[] {
  const last_result = useRef<Line[]>([]);
  const _get = useCallback(() => {
    const buffer = terminal.buffer.normal;
    const text_end = g_scrollbackStartMap.get(terminalId) ?? 0;
    let ret: Line[] = [];
    let missing = false;
    for (let i = start; i < end; i++) {
      if (i < text_end) {
        const text = _getLine(terminalId, i);
        if (text !== undefined) {
          ret.push({ key: `sb-text-${i}`, text });
        } else {
          ret.push({ key: `sb-missing-${i}` });
          missing = true;
        }
      } else {
        const line = buffer.getLine(i - text_end);
        ret.push({ key: `sb-line-${i}`, line });
      }
    }
    if (missing) {
      void fetchScrollback({
        sessionName: session.sessionName,
        terminalId,
        start,
        end,
      });
    }
    if (_isEqual(ret, last_result.current)) {
      ret = last_result.current;
    } else {
      last_result.current = ret;
    }
    return ret;
  }, [session.sessionName, terminalId, terminal, start, end, last_result]);
  const _sub = useCallback(
    (callback: () => void) => {
      g_eventEmitter.on(session.sessionName, callback);
      return () => {
        g_eventEmitter.off(session.sessionName, callback);
      };
    },
    [session.sessionName]
  );
  return useSyncExternalStore(_sub, _get);
}
interface FetchParams {
  sessionName: string;
  terminalId: number;
  start: number;
  end: number;
}
export const fetchScrollback = herd(
  async (params: FetchParams): Promise<Error | null> => {
    const opts = {
      url: `/api/1/session/${params.sessionName}/terminal/${params.terminalId}/scrollback`,
    };
    const res = await Api.get<ScrollbackJson>(opts);
    if (res.err) {
      errorLog('ScrollbackStore.fetchScrollback: err:', res.err, res.body);
    } else {
      g_scrollbackLinesMap.set(params.terminalId, res.body.scrollback);
      _emit(params.sessionName);
    }
    return res.err;
  },
  (params: FetchParams) => String(params.terminalId)
);
function _isEqual(a: Line[], b: Line[]) {
  let ret = true;
  if (a.length !== b.length) {
    ret = false;
  } else {
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.key !== b[i]?.key) {
        ret = false;
        break;
      }
    }
  }
  return ret;
}
export default { setScrollback, useScrollbackLength, useLines };
