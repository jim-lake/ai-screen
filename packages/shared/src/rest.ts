import type { CursorJson } from './common';

export interface ClientJson {
  clientPath: string;
  created: string;
  fd: number | null;
}
export interface SessionJson {
  sessionName: string;
  created: string;
  clients: ClientJson[];
  terminalParams: { rows: number; columns: number };
  terminals: { terminalId: number }[];
  activeTerminal: TerminalJson | null;
}
export interface BufferState {
  cursor: CursorJson;
  buffer: string[];
}
export interface TerminalJson {
  terminalId: number;
  normal: BufferState;
  alternate?: BufferState;
  startY: number;
}
export interface SessionListJson {
  sessions: SessionJson[];
}
