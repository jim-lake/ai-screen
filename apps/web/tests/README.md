# Web App Tests

This directory contains comprehensive end-to-end tests for the ai-screen web application with minimal mocking to ensure real-world functionality.

## Testing Philosophy

The tests in this directory follow an **end-to-end testing approach with minimal mocking**:

- **Real CLI Server**: Tests start an actual CLI server process using the same pattern as CLI tests
- **Real Sessions**: Tests create actual terminal sessions and execute real commands
- **Real Terminal Data**: Tests use actual terminal output, cursor positions, and buffer states
- **Minimal Mocking**: Only mock what cannot work in test environment (xterm.js DOM manipulation, measurement tools)

## Test Files

### Core End-to-End Tests

- **`terminal-e2e.test.tsx`** - Comprehensive end-to-end tests of Terminal component with real server
- **`session-store-e2e.test.tsx`** - End-to-end tests of session store with real API calls
- **`connect-store-e2e.test.tsx`** - End-to-end tests of connect store with real WebSocket connections

### Component Tests with Real Data

- **`terminal-simple.test.tsx`** - Basic Terminal component tests using real session data
- **`terminal-content.test.tsx`** - Terminal content verification with real server output

## Test Infrastructure

### `test-utils.ts`

Provides utilities for end-to-end testing:

- `startTestServer()` - Starts real CLI server using same pattern as CLI tests
- `stopTestServer()` - Gracefully shuts down test server
- `createTestSession()` - Creates real terminal session on server
- `writeToSession()` - Executes real commands in terminal session
- `getTerminalState()` - Retrieves actual terminal state from server
- `waitForTerminalOutput()` - Waits for command execution to complete

### Minimal Mocking Strategy

Only the following are mocked because they cannot work in test environment:

1. **`@xterm/xterm`** - DOM terminal emulator (mocked to capture writes)
2. **Measurement tools** - Font/character size measurement
3. **Component size hooks** - DOM size measurement
4. **API module** - Only to redirect to test server port

Everything else uses real implementations:
- Session store logic
- Connect store logic  
- Terminal state management
- HTTP API calls
- WebSocket connections (where possible)

## Running Tests

```bash
# Run all web tests
npm test

# Run specific test file
npm test terminal-e2e.test.tsx

# Run tests in watch mode
npm test --watch
```

## Test Data Flow

1. **Server Startup**: Each test suite starts a real CLI server process
2. **Session Creation**: Tests create real terminal sessions via HTTP API
3. **Command Execution**: Tests execute real shell commands via write API
4. **State Retrieval**: Tests fetch actual terminal state (buffer, cursor, etc.)
5. **Component Testing**: Tests render components with real session data
6. **Verification**: Tests verify component behavior with actual terminal output

## Benefits of This Approach

### Real Integration Testing
- Tests actual CLI server integration
- Verifies real terminal command execution
- Tests actual API endpoints and data flow
- Validates real session management

### Minimal Test Brittleness
- Fewer mocks mean fewer things to break when implementation changes
- Tests verify actual behavior, not mock behavior
- Real data provides more confidence in functionality

### Better Bug Detection
- Tests catch integration issues between components
- Real terminal output reveals edge cases
- Actual server behavior is validated

### Easier Maintenance
- Less mock setup and maintenance
- Tests are closer to actual usage patterns
- Easier to understand what's being tested

## Example Test Pattern

```typescript
it('tests real terminal functionality', async () => {
  // Create real session
  const session = await createTestSession(serverInfo.port, 'test-session');
  
  // Execute real commands
  await writeToSession(serverInfo.port, 'test-session', 'echo "hello"\n');
  await waitForTerminalOutput(100);
  
  // Get real terminal state
  const terminalState = await getTerminalState(serverInfo.port, 'test-session');
  
  // Test component with real data
  render(<Terminal session={{...session, activeTerminal: terminalState}} />);
  
  // Verify real output is present
  expect(terminalState.normal.buffer.some(line => 
    line.includes('hello')
  )).toBe(true);
});
```

## Mock Verification

When mocks are necessary, they simulate real behavior:

```typescript
// Mock xterm to capture what would be written to real terminal
const mockTerminal = {
  write: vi.fn(),
  _writtenContent: '',
};

mockTerminal.write.mockImplementation((data: string) => {
  mockTerminal._writtenContent += data;
  // Simulate DOM updates like real xterm would do
  if (mockTerminal._element) {
    mockTerminal._element.textContent += data;
  }
});
```

This approach ensures tests are both comprehensive and maintainable while providing high confidence in the application's real-world functionality.
