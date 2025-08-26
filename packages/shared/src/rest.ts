import type { BufferState } from './ansi';
import type { JSONObject } from './json';

export interface ClientJson {
  clientPath: string;
  created: string;
  fd: number | null;
  exclusive: boolean;
}
export interface SessionJson {
  sessionName: string;
  created: string;
  clients: ClientJson[];
  terminalParams: { rows: number; columns: number };
  terminals: { terminalId: number }[];
  activeTerminal: TerminalJson | null;
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
export interface SettingsJson {
  settings: JSONObject;
}
