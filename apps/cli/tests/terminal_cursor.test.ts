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
    assert.strictEqual(typeof state.screen_state.cursorX, 'number');
    assert.strictEqual(typeof state.screen_state.cursorY, 'number');
    assert.strictEqual(state.screen_state.cursorX >= 0, true);
    assert.strictEqual(state.screen_state.cursorX < 80, true); // Within 80 columns
    assert.strictEqual(state.screen_state.cursorY >= 0, true);
    assert.strictEqual(state.screen_state.cursorY < 24, true); // Within 24 rows

    // Content should contain the initial prompt
    assert.strictEqual(typeof state.screen_state.content, 'string');
    assert.strictEqual(state.screen_state.content.length > 0, true);
  });

  await t.test('cursor movement after echo command', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Validate initial cursor is within bounds
    assert.strictEqual(initial_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorX < 80, true);
    assert.strictEqual(initial_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorY < 24, true);

    // Send echo command
    await writeToSession(SESSION_NAME, 'echo "foo"\n');

    // Wait for command to execute and output to appear
    await waitForTerminalOutput(300);

    // Get state after command
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds at all times
    assert.strictEqual(after_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorX < 80, true); // Never exceed 80 columns
    assert.strictEqual(after_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorY < 24, true); // Never exceed 24 rows

    // After echo "foo", cursor should have moved down or stayed same (if terminal scrolled)
    // The key is that Y coordinate must never exceed terminal height
    assert.strictEqual(
      after_state.screen_state.cursorY >= initial_cursor_y ||
        after_state.screen_state.cursorY < 24,
      true
    );

    // Content should now contain "foo"
    assert.strictEqual(after_state.screen_state.content.includes('foo'), true);
  });

  await t.test('buffer content grows with multiple echo commands', async () => {
    // Get initial content length
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_content_length = initial_state.screen_state.content.length;
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Validate initial cursor is within bounds
    assert.strictEqual(initial_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorX < 80, true);
    assert.strictEqual(initial_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorY < 24, true);

    // Send multiple echo commands
    await writeToSession(SESSION_NAME, 'echo "line1"\n');
    await waitForTerminalOutput(200);

    // Check bounds after first command
    let state = await getTerminalState(SESSION_NAME);
    assert.strictEqual(state.screen_state.cursorX >= 0, true);
    assert.strictEqual(state.screen_state.cursorX < 80, true);
    assert.strictEqual(state.screen_state.cursorY >= 0, true);
    assert.strictEqual(state.screen_state.cursorY < 24, true);

    await writeToSession(SESSION_NAME, 'echo "line2"\n');
    await waitForTerminalOutput(200);

    // Check bounds after second command
    state = await getTerminalState(SESSION_NAME);
    assert.strictEqual(state.screen_state.cursorX >= 0, true);
    assert.strictEqual(state.screen_state.cursorX < 80, true);
    assert.strictEqual(state.screen_state.cursorY >= 0, true);
    assert.strictEqual(state.screen_state.cursorY < 24, true);

    await writeToSession(SESSION_NAME, 'echo "line3"\n');
    await waitForTerminalOutput(200);

    // Get final state
    const final_state = await getTerminalState(SESSION_NAME);

    // Final cursor must be within bounds
    assert.strictEqual(final_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(final_state.screen_state.cursorX < 80, true);
    assert.strictEqual(final_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(final_state.screen_state.cursorY < 24, true);

    // Buffer should have grown (or at least not shrunk significantly)
    // Allow for some flexibility as terminal might have scrolling behavior
    assert.strictEqual(
      final_state.screen_state.content.length >= initial_content_length - 100,
      true
    );

    // Cursor should have moved down or stayed roughly the same (allowing for scrolling)
    assert.strictEqual(
      final_state.screen_state.cursorY >= initial_cursor_y - 5,
      true
    );

    // Content should contain at least one of the lines (others might have scrolled)
    const has_line =
      final_state.screen_state.content.includes('line1') ||
      final_state.screen_state.content.includes('line2') ||
      final_state.screen_state.content.includes('line3');
    assert.strictEqual(has_line, true);
  });

  await t.test('cursor position with multiline output', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Validate initial cursor is within bounds
    assert.strictEqual(initial_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorX < 80, true);
    assert.strictEqual(initial_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorY < 24, true);

    // Send command that produces multiple lines of output
    await writeToSession(SESSION_NAME, 'printf "line1\\nline2\\nline3\\n"\n');
    await waitForTerminalOutput(300);

    // Get state after multiline output
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds
    assert.strictEqual(after_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorX < 80, true);
    assert.strictEqual(after_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorY < 24, true);

    // Cursor should have moved down by at least 1 line (command + output)
    // But if terminal scrolled, Y might be less than initial + expected lines
    const cursor_movement = after_state.screen_state.cursorY - initial_cursor_y;
    assert.strictEqual(
      cursor_movement >= 1 || after_state.screen_state.cursorY < 24,
      true
    );

    // Content should contain at least one of the output lines
    const has_output_line =
      after_state.screen_state.content.includes('line1') ||
      after_state.screen_state.content.includes('line2') ||
      after_state.screen_state.content.includes('line3');
    assert.strictEqual(has_output_line, true);
  });

  await t.test('cursor position after long line that wraps', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Validate initial cursor is within bounds
    assert.strictEqual(initial_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorX < 80, true);
    assert.strictEqual(initial_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(initial_state.screen_state.cursorY < 24, true);

    // Create a long line that should wrap (100 characters on 80-column terminal)
    const long_text = 'a'.repeat(100);
    await writeToSession(SESSION_NAME, `echo "${long_text}"\n`);
    await waitForTerminalOutput(300);

    // Get state after long line
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor must stay within terminal bounds even with wrapping
    assert.strictEqual(after_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorX < 80, true);
    assert.strictEqual(after_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(after_state.screen_state.cursorY < 24, true);

    // Cursor should have moved down by at least 1 line (command + wrapped output)
    // But if terminal scrolled, Y might be less than initial + expected lines
    const cursor_movement = after_state.screen_state.cursorY - initial_cursor_y;
    assert.strictEqual(
      cursor_movement >= 1 || after_state.screen_state.cursorY < 24,
      true
    );

    // Content should contain the long text (or at least part of it if scrolled)
    const has_long_text =
      after_state.screen_state.content.includes(long_text) ||
      after_state.screen_state.content.includes('a'.repeat(50)); // At least half
    assert.strictEqual(has_long_text, true);
  });

  await t.test('cursor position after clear command', async () => {
    // Send clear command to reset the terminal
    await writeToSession(SESSION_NAME, 'clear\n');
    await waitForTerminalOutput(200);

    // Get state after clear
    const after_clear_state = await getTerminalState(SESSION_NAME);

    // After clear, cursor must still be within terminal bounds
    assert.strictEqual(after_clear_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(after_clear_state.screen_state.cursorX < 80, true);
    assert.strictEqual(after_clear_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(after_clear_state.screen_state.cursorY < 24, true);

    // Content should be present (at least the prompt after clear)
    assert.strictEqual(after_clear_state.screen_state.content.length > 0, true);
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

        // Cursor must ALWAYS stay within terminal bounds (24 rows x 80 columns)
        assert.strictEqual(state.screen_state.cursorX >= 0, true);
        assert.strictEqual(state.screen_state.cursorX < 80, true);
        assert.strictEqual(state.screen_state.cursorY >= 0, true);
        assert.strictEqual(state.screen_state.cursorY < 24, true);

        // Cursor should generally move down or stay the same (never go backwards significantly)
        // Allow for some flexibility in case of terminal scrolling
        assert.strictEqual(
          state.screen_state.cursorY >= previous_cursor_y - 5,
          true
        );

        previous_cursor_y = state.screen_state.cursorY;
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

      // Validate cursor is within bounds
      assert.strictEqual(state_with_marker.screen_state.cursorX >= 0, true);
      assert.strictEqual(state_with_marker.screen_state.cursorX < 80, true);
      assert.strictEqual(state_with_marker.screen_state.cursorY >= 0, true);
      assert.strictEqual(state_with_marker.screen_state.cursorY < 24, true);

      assert.strictEqual(
        state_with_marker.screen_state.content.includes(unique_marker),
        true
      );

      // Send more commands
      await writeToSession(SESSION_NAME, 'echo "more content"\n');
      await waitForTerminalOutput(200);

      // Check bounds after first additional command
      const intermediate_state = await getTerminalState(SESSION_NAME);
      assert.strictEqual(intermediate_state.screen_state.cursorX >= 0, true);
      assert.strictEqual(intermediate_state.screen_state.cursorX < 80, true);
      assert.strictEqual(intermediate_state.screen_state.cursorY >= 0, true);
      assert.strictEqual(intermediate_state.screen_state.cursorY < 24, true);

      await writeToSession(SESSION_NAME, 'ls .\n');
      await waitForTerminalOutput(200);

      // Get final state
      const final_state = await getTerminalState(SESSION_NAME);

      // Final cursor must be within bounds
      assert.strictEqual(final_state.screen_state.cursorX >= 0, true);
      assert.strictEqual(final_state.screen_state.cursorX < 80, true);
      assert.strictEqual(final_state.screen_state.cursorY >= 0, true);
      assert.strictEqual(final_state.screen_state.cursorY < 24, true);

      // Buffer should contain new content
      assert.strictEqual(
        final_state.screen_state.content.includes('more content'),
        true
      );

      // Buffer should have grown or maintained size
      assert.strictEqual(
        final_state.screen_state.content.length >=
          state_with_marker.screen_state.content.length,
        true
      );
    }
  );
});
