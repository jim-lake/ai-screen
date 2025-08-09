# AI Screen - A `screen` Emulator in TypeScript

This project is a command-line tool that emulates the functionality of the GNU `screen` utility, written in TypeScript and running on Node.js. It allows for creating, managing, and interacting with multiple terminal sessions from a single command-line interface.

## Implementation Plan

### 1. Project Setup

- **Directory Structure:**
  - `src/`: TypeScript source code.
    - `main.ts`: Entry point for the CLI.
    - `session.ts`: Session management logic.
    - `terminal.ts`: Terminal emulation and I/O handling.
  - `tests/`: Test files using `node:test`.
    - `session.test.ts`: Unit tests for session management.
    - `terminal.test.ts`: Unit tests for terminal handling.
- **Configuration:**
  - `package.json`: Project metadata, dependencies, and scripts.
  - `tsconfig.json`: TypeScript compiler options.

### 2. Core Functionality

- **Session Management:**
  - Create new sessions.
  - Attach to existing sessions.
  - Detach from sessions.
  - List all running sessions.
  - Terminate sessions.
- **Terminal Multiplexing:**
  - Manage multiple windows within a single session.
  - Switch between windows.
  - Create new windows.
  - Close windows.
- **Terminal Emulation:**
  - Handle standard input and output.
  - Support for special key combinations (e.g., `Ctrl+A`).
  - Pass-through of terminal commands to the underlying shell.

### 3. Asynchronous Code Patterns

- The entire application will be built using `async/await` for handling asynchronous operations, such as reading from and writing to the terminal.
- Promises will be used to manage concurrent operations, such as handling multiple terminal sessions simultaneously.

### 4. Command-Line Interface (CLI)

The CLI will be implemented using a modern Node.js framework like `commander` or `yargs`.

- `ai-screen`: Start a new session.
- `ai-screen -ls`: List all running sessions.
- `ai-screen -r <session_name>`: Attach to a specific session.
- `ai-screen -S <session_name>`: Create a new session with a specific name.

### 5. Testing Strategy

- **Unit Tests:**
  - Use the `node:test` runner for writing and executing tests.
  - Mock dependencies to isolate components.
  - Test individual functions and classes for session and terminal management.
- **Integration Tests:**
  - Test the interaction between different components, such as creating a session and sending commands to it.
  - Use child processes to spawn the CLI and interact with it from the tests.

### 6. Dependencies

- **`typescript`**: TypeScript compiler.
- **`@types/node`**: TypeScript type definitions for Node.js.
- **`commander` or `yargs`**: CLI framework.
- **`node-pty`**: forked process management for terminal emulation.

### 7. Build and Distribution

- **Build:**
  - Use `tsc` to compile the TypeScript code to JavaScript.
  - Create a `dist/` directory for the compiled output.
- **Distribution:**
  - Package the application as an executable using a tool like `pkg` or `nexe`.
  - Publish the package to npm for easy installation.

## Development Roadmap

1.  **Milestone 1: Basic Session Management (1-2 weeks)**
    - Implement session creation and termination.
    - Basic terminal I/O.
2.  **Milestone 2: Detach and Attach (2-3 weeks)**
    - Implement detach and attach functionality.
    - Persist session state.
3.  **Milestone 3: Multiplexing (3-4 weeks)**
    - Add support for multiple windows.
    - Implement window switching.
4.  **Milestone 4: CLI and Testing (2-3 weeks)**
    - Build out the full CLI.
    - Write comprehensive unit and integration tests.
5.  **Milestone 5: Beta Release (1 week)**
    - Package the application for distribution.
    - Release a beta version for feedback.
