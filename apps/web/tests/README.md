# Terminal Renderer Tests

This directory (`apps/web/tests`) contains Vitest tests for the terminal renderer component in the web application.

## Overview

The tests verify that the terminal component correctly renders and handles terminal content. They inspect both the mock terminal writes AND the actual DOM textContent under the inner View that Xterm connects to, ensuring the final text contents have what we expect without being brittle about the DOM structure.

## Test Files

### `terminal-simple.test.tsx`

Basic tests for the Terminal component functionality:

- Component rendering with test ID
- Connect/disconnect lifecycle
- Different zoom modes (SHRINK, EXPAND, FIT)
- Mock terminal content verification
- ANSI escape sequence handling
- Terminal resize operations

### `terminal-content.test.tsx`

Comprehensive tests for terminal content verification with DOM inspection:

- Command output display verification with DOM textContent inspection
- Multi-line command output handling
- Error messages and special characters in DOM
- Comprehensive DOM structure inspection
- ANSI escape sequences in DOM content

### `setup.ts`

Test setup file that configures the testing environment:

- Imports `@testing-library/jest-dom` for additional matchers
- Mocks WebSocket for tests

### `test-utils.ts`

Utility functions for managing CLI server in tests (currently unused):

- Functions for starting/stopping test server
- HTTP request utilities
- Session management helpers

## Key Testing Approach

### Dual Verification Strategy

The tests use a **dual verification approach**:

1. **Mock Terminal Tracking**: Captures all `write()` calls to verify content flow
2. **DOM textContent Inspection**: Verifies the actual DOM content under `terminal-inner`

This ensures that:

- Content is properly written to the terminal (mock verification)
- Content appears in the DOM as expected (DOM inspection)
- The integration between xterm.js and the DOM works correctly

### Mocking Strategy

- **Xterm.js**: Mocked to capture `write()` calls AND simulate DOM updates
- **Connect Store**: Mocked to simulate terminal connection behavior
- **Settings Store**: Mocked to provide consistent font settings
- **Measurement Tools**: Mocked to provide predictable character sizing

### Content Verification

The tests verify terminal content by:

1. Mocking the xterm Terminal class to track all `write()` calls
2. Simulating xterm's DOM manipulation by updating `textContent`
3. Writing terminal buffer content to the mock terminal
4. **Inspecting the DOM textContent** under `terminal-inner` element
5. Asserting that expected text content appears in both mock and DOM

### DOM Structure Flexibility

The tests are designed to be **non-brittle** about DOM structure:

- Only rely on the `data-testid="terminal-inner"` element
- Don't make assumptions about the internal DOM structure that xterm.js creates
- Focus on **textContent inspection** rather than specific DOM element structure
- Allow xterm.js to handle its own DOM manipulation without interference
- Verify content accessibility through `textContent` property

## DOM TextContent Inspection

### What We Inspect

The tests inspect the `textContent` of the `terminal-inner` element to verify:

- **Commands**: `echo`, `ls`, `cat`, `ps`, `grep`, `git`, etc.
- **Command Output**: File listings, error messages, process information
- **Special Characters**: `!@#$%^&*()_+-={}[]|\\:"`, ANSI escape sequences
- **Multi-line Content**: Complex command outputs spanning multiple lines
- **File Permissions**: `-rw-r--r--`, `drwxr-xr-x`, timestamps, sizes
- **Git Status**: Modified files (`M`), added files (`A`), untracked files (`??`)
- **Command Substitution**: `$(command)` syntax and results
- **Variable Expansion**: `$?` and other shell variables
- **Prompts**: `$ ` command prompts

### How We Inspect

```typescript
// Get the terminal inner element
const terminalInner = screen.getByTestId('terminal-inner');

// Inspect the textContent (what user would see)
const domTextContent = terminalInner.textContent || '';

// Verify expected content appears in DOM
expect(domTextContent).toContain('expected command output');
expect(domTextContent).toContain('error messages');
expect(domTextContent).toContain('special characters');

// Verify content structure
expect(domTextContent.length).toBeGreaterThan(expectedMinLength);
```

### Non-Brittle Approach

- **✅ Do**: Check `textContent` for expected strings
- **✅ Do**: Verify content length and structure
- **✅ Do**: Count occurrences of patterns (e.g., prompts)
- **❌ Don't**: Assume specific HTML structure under `terminal-inner`
- **❌ Don't**: Rely on specific CSS classes or element hierarchy
- **❌ Don't**: Make assumptions about xterm.js internal DOM manipulation

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- terminal-simple
npm test -- terminal-content
```

## Test Coverage

The tests cover:

- ✅ Component rendering and lifecycle
- ✅ Terminal content display verification (mock + DOM)
- ✅ Command execution output in DOM textContent
- ✅ Multi-line output handling in DOM
- ✅ Error message display in DOM
- ✅ Special character preservation in DOM
- ✅ ANSI escape sequence handling in DOM
- ✅ Different zoom modes
- ✅ Terminal resize operations
- ✅ Connect/disconnect behavior
- ✅ Comprehensive DOM textContent inspection
- ✅ File permissions and timestamps in DOM
- ✅ Git status output in DOM
- ✅ Command substitution results in DOM

## Key Benefits

1. **Comprehensive Coverage**: Tests both the component logic and final DOM output
2. **Non-Brittle**: Doesn't break when xterm.js changes its internal DOM structure
3. **User-Focused**: Verifies what users actually see (textContent)
4. **Integration Testing**: Ensures the component properly integrates with xterm.js
5. **Content Verification**: Confirms terminal content appears correctly in the DOM
6. **Maintainable**: Easy to update when adding new terminal features

This approach provides the most reliable way to test terminal content rendering while remaining flexible about the underlying DOM implementation.
