interface AnsiDisplayJson {
    cursor?: {
        x?: number;
        y?: number;
        blinking?: boolean;
        visible?: boolean;
    };
    alt_screen?: boolean;
}

type WsServerMessage = {
    type: 'connect_success';
} | {
    type: 'error';
    err: string;
} | ({
    type: 'disconnect';
    reason: string;
} & AnsiDisplayJson);
type WsClientMessage = ({
    type: 'connect';
    name: string;
    exclusive: boolean;
    rows: number;
    columns: number;
} & AnsiDisplayJson) | {
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

interface ClientJson {
    client_path: string;
    created: string;
    fd: number | null;
}
interface SessionJson {
    session_name: string;
    created: string;
    client_list: ClientJson[];
    terminal_params: {
        rows: number;
        columns: number;
    };
    terminal_list: TerminalJson[];
    active_terminal: TerminalJson | null;
}
interface TerminalJson {
    terminal_id: number;
}
interface SessionListJson {
    session_list: SessionJson[];
}

declare const _default: {};

export { _default as default };
export type { AnsiDisplayJson, ClientJson, SessionJson, SessionListJson, TerminalJson, WsClientMessage, WsServerMessage };
