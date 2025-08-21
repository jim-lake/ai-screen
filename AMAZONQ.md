# AI-Screen Project Analysis

## Project Overview

This is a **TypeScript implementation of a GNU screen emulator** that provides terminal multiplexing capabilities. It's structured as a monorepo with a CLI application that mimics the functionality of the traditional `screen` command.

## Architecture

### 1. **Client-Server Architecture**

The project uses a client-server model where:

- **Server**: Manages sessions and terminals in the background
- **Client**: CLI interface that connects to the server to create/attach to sessions

### 2. **Core Components**

#### **Session Management** (`src/lib/session.ts`)

- **Session**: Main container that holds multiple terminals and clients
- Manages terminal creation, client connections, and I/O routing
- Handles session lifecycle (create, attach, detach, cleanup)
- Maintains a global session registry

#### **Terminal Emulation** (`src/lib/terminal.ts`)

- Uses `node-pty` for actual terminal process spawning
- Handles terminal I/O, resizing, and process lifecycle
- Each terminal runs a shell process (bash by default)

#### **Client Management** (`src/lib/client.ts`)

- Represents a connected client to a session
- Handles stdin/stdout routing between client and terminal
- Manages client disconnection and cleanup

### 3. **Communication Layers**

#### **HTTP API** (`src/server/web_server.ts`)

- REST API for session management operations
- Endpoints for listing sessions, creating sessions, server status
- Runs on localhost:6847 by default

#### **Unix Domain Socket** (`src/server/pipe_server.ts`)

- Low-latency IPC for real-time terminal I/O
- Handles connect, write, resize, and detach operations
- Uses file descriptor passing for efficient I/O

### 4. **CLI Interface** (`src/cli.ts`)

Implements screen-compatible command-line options:

- `-dmS <name>`: Create detached session
- `-r [session]`: Reattach to session
- `-ls`: List sessions
- `--server`: Start server daemon
- `--kill-server`: Stop server

## Key Features

### **Session Persistence**

- Sessions run independently of client connections
- Can detach from sessions and reattach later
- Sessions persist until explicitly terminated or all terminals exit

### **Terminal Multiplexing**

- Multiple terminals per session (though UI switching not fully implemented)
- Real-time I/O between client and active terminal
- Terminal resizing support

### **Process Management**

- Background server daemon manages all sessions
- Automatic cleanup when terminals/sessions exit
- Proper signal handling and resource cleanup

## Development Setup

The project uses:

- **TypeScript** with modern ES modules
- **Rollup** for building and bundling
- **Node.js built-in test runner** for testing
- **ESLint + Prettier** for code quality
- **Workspaces** for monorepo management

## Project Structure

```
ai-screen/
├── package.json                    # Root workspace configuration
├── apps/
│   └── cli/                       # Main CLI application
│       ├── package.json           # CLI package configuration
│       ├── src/
│       │   ├── cli.ts            # CLI entry point and argument parsing
│       │   ├── index.ts          # Main API exports and server management
│       │   ├── cli_options.ts    # Screen-compatible CLI options
│       │   ├── cli_exit_code.ts  # Exit code definitions
│       │   ├── server/           # Server components
│       │   │   ├── index.ts      # Server startup coordination
│       │   │   ├── web_server.ts # HTTP API server
│       │   │   ├── pipe_server.ts# Unix socket IPC server
│       │   │   └── routes/       # HTTP API routes
│       │   │       ├── session.ts# Session management endpoints
│       │   │       └── terminal.ts# Terminal management endpoints
│       │   ├── client/           # Client-side components
│       │   │   ├── index.ts      # Client API exports
│       │   │   ├── request.ts    # HTTP request utilities
│       │   │   └── connect.ts    # Session connection logic
│       │   ├── lib/              # Core library components
│       │   │   ├── session.ts    # Session management class
│       │   │   ├── terminal.ts   # Terminal emulation class
│       │   │   ├── client.ts     # Client connection class
│       │   │   └── pipe.ts       # IPC message types
│       │   ├── tools/            # Utility modules
│       │   └── types/            # TypeScript type definitions
│       ├── tests/                # Test suite
│       └── rollup.config.js      # Build configuration
└── node_modules/                 # Dependencies
```

## Core Classes and Interfaces

### Session Class

```typescript
class Session {
  name: string;
  created: Date;
  clients: Client[];
  activeTerminal: Terminal | null;
  terminals: Terminal[];

  createTerminal(params?: Partial<TerminalParams>): Terminal;
  connectClient(params: ConnectParams): Client;
  resize(params: { rows: number; columns: number }): void;
  write(data: string): void;
  detach(path: string): void;
  close(): void;
}
```

### Terminal Class

```typescript
class Terminal extends EventEmitter {
  id: number;
  pty: IPty;

  write(data: string): void;
  resize(params: { rows: number; columns: number }): void;
  destroy(): void;
}
```

### Client Class

```typescript
class Client extends EventEmitter {
  path: string;
  fd: number;

  write(data: string): void;
  disconnect(reason: string): void;
  changeTerminal(terminal: Terminal): void;
}
```

## API Endpoints

### HTTP API (Port 6847)

- `GET /api/1/session` - List all sessions
- `POST /api/1/session/:name` - Create new session
- `GET /status` - Server status and socket path
- `GET /quit` - Shutdown server

### Unix Socket IPC

- `connect` - Attach client to session
- `write` - Send data to terminal
- `resize` - Resize terminal
- `detach` - Detach client from session

## Message Flow

1. **Session Creation**: Client sends HTTP POST to create session
2. **Connection**: Client connects via Unix socket with file descriptor
3. **I/O**: Real-time terminal I/O flows through Unix socket
4. **Detach**: Client can detach while session continues running
5. **Reattach**: Client can reconnect to existing session

## Current State

The implementation provides:
✅ Basic session creation and management  
✅ Terminal spawning with node-pty  
✅ Client-server communication  
✅ Attach/detach functionality  
✅ HTTP API for session operations  
✅ Unix socket for real-time I/O

**Missing/Incomplete:**

- Window switching within sessions (multiple terminals)
- Full screen command compatibility
- Configuration file support
- Advanced terminal features (scrollback, etc.)
- Comprehensive error handling

## Build and Development

### Scripts

- `npm run build` - Build the project with Rollup
- `npm run dev` - Run in development mode with tsx
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run pretty` - Format code with Prettier

### Dependencies

- **Runtime**: `node-pty`, `express`, `commander`, `unix-dgram`
- **Build**: `typescript`, `rollup`, `tsx`
- **Development**: `eslint`, `prettier`, `@types/*`

This is a solid foundation for a screen emulator with the core multiplexing functionality working. The architecture is well-designed for extending with additional features like window management and more advanced terminal capabilities.
