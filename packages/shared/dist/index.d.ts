type DeepPartial<T> = T extends Function ? T : T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;

interface CursorState {
    x: number;
    y: number;
    visible: boolean;
    blinking: boolean;
}
interface AnsiDisplayState {
    cursor: CursorState;
    altScreen: boolean;
}
type CursorJson = CursorState;
type AnsiDisplayJson = AnsiDisplayState;
interface BufferState {
    cursor: CursorJson;
    buffer: string[];
}
declare function displayStateToAnsi(state: DeepPartial<AnsiDisplayState>): string;

type JSONPrimitive = string | number | boolean | null | undefined;
type JSONValue = JSONPrimitive | JSONObject | JSONArray;
interface JSONObject {
    [key: string]: JSONValue;
}
type JSONArray = JSONValue[];
declare function jsonParse<T = JSONObject>(json_obj: string): T | undefined;

type DisconnectMessage = {
    type: 'disconnect';
    reason: string;
} & AnsiDisplayJson;
type WsServerMessage = {
    type: 'connect_success';
    rows: number;
    columns: number;
    normal: BufferState;
    alternate?: BufferState;
} | {
    type: 'error';
    err: string;
} | {
    type: 'resize';
    rows: number;
    columns: number;
} | {
    type: 'data';
    data: string;
} | DisconnectMessage;
type WsClientMessage = ({
    type: 'connect';
    name: string;
    exclusive: boolean;
    rows?: number;
    columns?: number;
} & DeepPartial<AnsiDisplayJson>) | {
    type: 'write';
    data: string;
} | {
    type: 'resize';
    rows: number;
    columns: number;
} | {
    type: 'detach';
};

type PipeServerMessage = {
    type: 'connect_success';
} | {
    type: 'error';
    err: string;
} | DisconnectMessage | {
    type: 'resize';
    rows: number;
    columns: number;
} | {
    type: 'pong';
};
type PipeClientMessage = ({
    type: 'connect';
    name: string;
    exclusive: boolean;
    rows: number;
    columns: number;
} & DeepPartial<AnsiDisplayJson>) | {
    type: 'write';
    name: string;
    data: string;
} | {
    type: 'resize';
    name: string;
    rows: number;
    columns: number;
} | {
    type: 'detach';
    name: string;
} | {
    type: 'ping';
    name: string;
};

interface ClientJson {
    clientPath: string;
    created: string;
    fd: number | null;
    exclusive: boolean;
}
interface SessionJson {
    sessionName: string;
    created: string;
    clients: ClientJson[];
    terminalParams: {
        rows: number;
        columns: number;
    };
    terminals: {
        terminalId: number;
    }[];
    activeTerminal: TerminalJson | null;
}
interface TerminalJson {
    terminalId: number;
    normal: BufferState;
    alternate?: BufferState;
    startY: number;
}
interface SessionListJson {
    sessions: SessionJson[];
}
interface SettingsJson {
    settings: JSONObject;
}

declare const _default: {
    jsonParse<T = JSONObject>(json_obj: string): T | undefined;
    displayStateToAnsi(state: DeepPartial<AnsiDisplayState>): string;
};

export { _default as default, displayStateToAnsi, jsonParse };
export type { AnsiDisplayJson, AnsiDisplayState, BufferState, ClientJson, CursorJson, CursorState, DisconnectMessage, JSONArray, JSONObject, JSONPrimitive, JSONValue, PipeClientMessage, PipeServerMessage, SessionJson, SessionListJson, SettingsJson, TerminalJson, WsClientMessage, WsServerMessage };
