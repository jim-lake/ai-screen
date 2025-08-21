export interface ClientJson {
  path: string;
  created: string;
  fd: number | null;
}
export interface SessionJson {
  name: string;
  created: string;
  client_list: ClientJson[];
  terminal_params: { rows: number; columns: number };
  terminal_list: TerminalJson[];
  active_terminal: TerminalJson | null;
}
export interface TerminalJson {
  id: number;
}
export interface SessionListJson {
  session_list: SessionJson[];
}
