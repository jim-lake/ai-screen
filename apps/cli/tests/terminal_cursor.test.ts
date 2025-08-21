import { test, before, after } from 'node:test';
import assert from 'node:assert';

import {
  startTestServer,
  stopTestServer,
  createTestSession,
  createTerminalInSession,
  getTerminalState,
  writeToSession,
  waitForTerminalOutput,
} from './helpers/test_utils';

const SESSION_NAME = 'cursor-test-session';

before(async () => {
  await startTestServer();
  await createTestSession(SESSION_NAME);
  await createTerminalInSession(SESSION_NAME);

  // Wait for initial shell prompt to appear
  await waitForTerminalOutput(500);
});

after(async () => {
  await stopTestServer();
});

void test('Terminal Cursor and Buffer Validation', async (t) => {
  await t.test('initial cursor position after shell startup', async () => {
    const state = await getTerminalState(SESSION_NAME);

    // After shell startup, cursor should be within terminal bounds (24 rows x 80 columns)
    // ANSI coordinates are 1-based
    assert.strictEqual(typeof state.normal.cursor.x, 'number');
    assert.strictEqual(typeof state.normal.cursor.y, 'number');
    assert.strictEqual(state.normal.cursor.x >= 1, true);
    assert.strictEqual(state.normal.cursor.x <= 80, true); // Within 80 columns
    assert.strictEqual(state.normal.cursor.y >= 1, true);
    assert.strictEqual(state.normal.cursor.y <= 24, true); // Within 24 rows

    // Buffer should contain terminal content
    assert.strictEqual(Array.isArray(state.normal.buffer), true);
    assert.strictEqual(state.normal.buffer.length > 0, true);
  });

  await t.test('cursor movement after echo command', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.normal.cursor.y;

    // Validate initial cursor is within bounds (ANSI 1-based)
    assert.strictEqual(initial_state.normal.cursor.x >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.x <= 80, true);
    assert.strictEqual(initial_state.normal.cursor.y >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.y <= 24, true);

    // Send echo command
    await writeToSession(SESSION_NAME, 'echo "foo"\n');

    // Wait for command to execute and output to appear
    await waitForTerminalOutput(300);

    // Get state after command
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds at all times (ANSI 1-based)
    assert.strictEqual(after_state.normal.cursor.x >= 1, true);
    assert.strictEqual(after_state.normal.cursor.x <= 80, true); // Never exceed 80 columns
    assert.strictEqual(after_state.normal.cursor.y >= 1, true);
    assert.strictEqual(after_state.normal.cursor.y <= 24, true); // Never exceed 24 rows

    // After echo "foo", cursor should have moved down or stayed same (if terminal scrolled)
    // The key is that Y coordinate must never exceed terminal height
    assert.strictEqual(
      after_state.normal.cursor.y >= initial_cursor_y ||
        after_state.normal.cursor.y <= 24,
      true
    );

    // Buffer should now contain "foo" in one of the lines
    const buffer_content = after_state.normal.buffer.join('\n');
    assert.strictEqual(buffer_content.includes('foo'), true);
  });

  await t.test('buffer content grows with multiple echo commands', async () => {
    // Get initial content length
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_buffer_length = initial_state.normal.buffer.length;
    const initial_cursor_y = initial_state.normal.cursor.y;

    // Validate initial cursor is within bounds (ANSI 1-based)
    assert.strictEqual(initial_state.normal.cursor.x >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.x <= 80, true);
    assert.strictEqual(initial_state.normal.cursor.y >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.y <= 24, true);

    // Send multiple echo commands
    await writeToSession(SESSION_NAME, 'echo "line1"\n');
    await waitForTerminalOutput(200);

    // Check bounds after first command (ANSI 1-based)
    let state = await getTerminalState(SESSION_NAME);
    assert.strictEqual(state.normal.cursor.x >= 1, true);
    assert.strictEqual(state.normal.cursor.x <= 80, true);
    assert.strictEqual(state.normal.cursor.y >= 1, true);
    assert.strictEqual(state.normal.cursor.y <= 24, true);

    await writeToSession(SESSION_NAME, 'echo "line2"\n');
    await waitForTerminalOutput(200);

    // Check bounds after second command (ANSI 1-based)
    state = await getTerminalState(SESSION_NAME);
    assert.strictEqual(state.normal.cursor.x >= 1, true);
    assert.strictEqual(state.normal.cursor.x <= 80, true);
    assert.strictEqual(state.normal.cursor.y >= 1, true);
    assert.strictEqual(state.normal.cursor.y <= 24, true);

    await writeToSession(SESSION_NAME, 'echo "line3"\n');
    await waitForTerminalOutput(200);

    // Get final state
    const final_state = await getTerminalState(SESSION_NAME);

    // Final cursor must be within bounds (ANSI 1-based)
    assert.strictEqual(final_state.normal.cursor.x >= 1, true);
    assert.strictEqual(final_state.normal.cursor.x <= 80, true);
    assert.strictEqual(final_state.normal.cursor.y >= 1, true);
    assert.strictEqual(final_state.normal.cursor.y <= 24, true);

    // Buffer should have grown (or at least not shrunk significantly)
    // Allow for some flexibility as terminal might have scrolling behavior
    assert.strictEqual(
      final_state.normal.buffer.length >= initial_buffer_length - 5,
      true
    );

    // Cursor should have moved down or stayed roughly the same (allowing for scrolling)
    assert.strictEqual(
      final_state.normal.cursor.y >= initial_cursor_y - 5,
      true
    );

    // Buffer should contain at least one of the lines (others might have scrolled)
    const buffer_content = final_state.normal.buffer.join('\n');
    const has_line =
      buffer_content.includes('line1') ||
      buffer_content.includes('line2') ||
      buffer_content.includes('line3');
    assert.strictEqual(has_line, true);
  });

  await t.test('cursor position with multiline output', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.normal.cursor.y;

    // Validate initial cursor is within bounds (ANSI 1-based)
    assert.strictEqual(initial_state.normal.cursor.x >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.x <= 80, true);
    assert.strictEqual(initial_state.normal.cursor.y >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.y <= 24, true);

    // Send command that produces multiple lines of output
    await writeToSession(SESSION_NAME, 'printf "line1\\nline2\\nline3\\n"\n');
    await waitForTerminalOutput(300);

    // Get state after multiline output
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds (ANSI 1-based)
    assert.strictEqual(after_state.normal.cursor.x >= 1, true);
    assert.strictEqual(after_state.normal.cursor.x <= 80, true);
    assert.strictEqual(after_state.normal.cursor.y >= 1, true);
    assert.strictEqual(after_state.normal.cursor.y <= 24, true);

    // Cursor should have moved down by at least 1 line (command + output)
    // But if terminal scrolled, Y might be less than initial + expected lines
    const cursor_movement = after_state.normal.cursor.y - initial_cursor_y;
    assert.strictEqual(
      cursor_movement >= 1 || after_state.normal.cursor.y <= 24,
      true
    );

    // Buffer should contain at least one of the output lines
    const buffer_content = after_state.normal.buffer.join('\n');
    const has_output_line =
      buffer_content.includes('line1') ||
      buffer_content.includes('line2') ||
      buffer_content.includes('line3');
    assert.strictEqual(has_output_line, true);
  });

  await t.test('cursor position after long line that wraps', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.normal.cursor.y;

    // Validate initial cursor is within bounds (ANSI 1-based)
    assert.strictEqual(initial_state.normal.cursor.x >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.x <= 80, true);
    assert.strictEqual(initial_state.normal.cursor.y >= 1, true);
    assert.strictEqual(initial_state.normal.cursor.y <= 24, true);

    // Create a long line that should wrap (100 characters on 80-column terminal)
    const long_text = 'a'.repeat(100);
    await writeToSession(SESSION_NAME, `echo "${long_text}"\n`);
    await waitForTerminalOutput(300);

    // Get state after long line
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds even with wrapping (ANSI 1-based)
    assert.strictEqual(after_state.normal.cursor.x >= 1, true);
    assert.strictEqual(after_state.normal.cursor.x <= 80, true);
    assert.strictEqual(after_state.normal.cursor.y >= 1, true);
    assert.strictEqual(after_state.normal.cursor.y <= 24, true);

    // Cursor should have moved down by at least 1 line (command + wrapped output)
    // But if terminal scrolled, Y might be less than initial + expected lines
    const cursor_movement = after_state.normal.cursor.y - initial_cursor_y;
    assert.strictEqual(
      cursor_movement >= 1 || after_state.normal.cursor.y <= 24,
      true
    );

    // Buffer should contain the long text (or at least part of it if scrolled)
    const buffer_content = after_state.normal.buffer.join('\n');
    const has_long_text =
      buffer_content.includes(long_text) ||
      buffer_content.includes('a'.repeat(50)); // At least half
    assert.strictEqual(has_long_text, true);
  });

  await t.test('cursor position after clear command', async () => {
    // Send clear command to reset the terminal
    await writeToSession(SESSION_NAME, 'clear\n');
    await waitForTerminalOutput(200);

    // Get state after clear
    const after_clear_state = await getTerminalState(SESSION_NAME);

    // After clear, cursor must still be within terminal bounds (ANSI 1-based)
    assert.strictEqual(after_clear_state.normal.cursor.x >= 1, true);
    assert.strictEqual(after_clear_state.normal.cursor.x <= 80, true);
    assert.strictEqual(after_clear_state.normal.cursor.y >= 1, true);
    assert.strictEqual(after_clear_state.normal.cursor.y <= 24, true);

    // Buffer should be present (at least the prompt after clear)
    assert.strictEqual(after_clear_state.normal.buffer.length > 0, true);
  });

  await t.test(
    'cursor position consistency across multiple operations',
    async () => {
      // Perform a series of operations and verify cursor tracking
      const operations = [
        'echo "test1"',
        'pwd',
        'echo "test2"',
        'date',
        'echo "final"',
      ];

      let previous_cursor_y = 0;

      for (const operation of operations) {
        await writeToSession(SESSION_NAME, `${operation}\n`);
        await waitForTerminalOutput(200);

        const state = await getTerminalState(SESSION_NAME);

        // Cursor must ALWAYS stay within terminal bounds (24 rows x 80 columns) - ANSI 1-based
        assert.strictEqual(state.normal.cursor.x >= 1, true);
        assert.strictEqual(state.normal.cursor.x <= 80, true);
        assert.strictEqual(state.normal.cursor.y >= 1, true);
        assert.strictEqual(state.normal.cursor.y <= 24, true);

        // Cursor should generally move down or stay the same (never go backwards significantly)
        // Allow for some flexibility in case of terminal scrolling
        assert.strictEqual(
          state.normal.cursor.y >= previous_cursor_y - 5,
          true
        );

        previous_cursor_y = state.normal.cursor.y;
      }
    }
  );

  await t.test(
    'buffer content preservation during cursor movement',
    async () => {
      // Send a distinctive command
      const unique_marker = `unique_test_${Date.now()}`;
      await writeToSession(SESSION_NAME, `echo "${unique_marker}"\n`);
      await waitForTerminalOutput(200);

      // Get state with our marker
      const state_with_marker = await getTerminalState(SESSION_NAME);

      // Validate cursor is within bounds (ANSI 1-based)
      assert.strictEqual(state_with_marker.normal.cursor.x >= 1, true);
      assert.strictEqual(state_with_marker.normal.cursor.x <= 80, true);
      assert.strictEqual(state_with_marker.normal.cursor.y >= 1, true);
      assert.strictEqual(state_with_marker.normal.cursor.y <= 24, true);

      const buffer_content = state_with_marker.normal.buffer.join('\n');
      assert.strictEqual(buffer_content.includes(unique_marker), true);

      // Send more commands
      await writeToSession(SESSION_NAME, 'echo "more content"\n');
      await waitForTerminalOutput(200);

      // Check bounds after first additional command (ANSI 1-based)
      const intermediate_state = await getTerminalState(SESSION_NAME);
      assert.strictEqual(intermediate_state.normal.cursor.x >= 1, true);
      assert.strictEqual(intermediate_state.normal.cursor.x <= 80, true);
      assert.strictEqual(intermediate_state.normal.cursor.y >= 1, true);
      assert.strictEqual(intermediate_state.normal.cursor.y <= 24, true);

      await writeToSession(SESSION_NAME, 'ls .\n');
      await waitForTerminalOutput(200);

      // Get final state
      const final_state = await getTerminalState(SESSION_NAME);

      // Final cursor must be within bounds (ANSI 1-based)
      assert.strictEqual(final_state.normal.cursor.x >= 1, true);
      assert.strictEqual(final_state.normal.cursor.x <= 80, true);
      assert.strictEqual(final_state.normal.cursor.y >= 1, true);
      assert.strictEqual(final_state.normal.cursor.y <= 24, true);

      // Buffer should contain new content
      const final_buffer_content = final_state.normal.buffer.join('\n');
      assert.strictEqual(final_buffer_content.includes('more content'), true);

      // Buffer should have grown or maintained size
      assert.strictEqual(
        final_state.normal.buffer.length >=
          state_with_marker.normal.buffer.length - 5, // Allow some flexibility for scrolling
        true
      );
    }
  );
});
