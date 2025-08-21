interface CursorJson {
    x: number;
    y: number;
    blinking: boolean;
    visible: boolean;
}
interface AnsiDisplayJson {
    cursor: CursorJson;
    altScreen: boolean;
}

type DeepPartial<T> = T extends Function ? T : T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;
type DisconnectMessage = {
    type: 'disconnect';
    reason: string;
} & AnsiDisplayJson;
type WsServerMessage = {
    type: 'connect_success';
} | {
    type: 'error';
    err: string;
} | DisconnectMessage;
type WsClientMessage = ({
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
};

type PipeServerMessage = WsServerMessage | {
    type: 'pong';
};
type PipeClientMessage = WsClientMessage | {
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
interface BufferState {
    cursor: CursorJson;
    buffer: string[];
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

declare const _default: {};

export { _default as default };
export type { AnsiDisplayJson, BufferState, ClientJson, CursorJson, DisconnectMessage, PipeClientMessage, PipeServerMessage, SessionJson, SessionListJson, TerminalJson, WsClientMessage, WsServerMessage };
