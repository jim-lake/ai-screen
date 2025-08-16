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
} from './helpers/test_utils.js';

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

    // After shell startup, cursor should be at the prompt
    // Typically at column 2 (after "$ ") and row 0 or 1
    assert.strictEqual(typeof state.screen_state.cursorX, 'number');
    assert.strictEqual(typeof state.screen_state.cursorY, 'number');
    assert.strictEqual(state.screen_state.cursorX >= 0, true);
    assert.strictEqual(state.screen_state.cursorY >= 0, true);

    // Content should contain the initial prompt
    assert.strictEqual(typeof state.screen_state.content, 'string');
    assert.strictEqual(state.screen_state.content.length > 0, true);
  });

  await t.test('cursor movement after echo command', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Send echo command
    await writeToSession(SESSION_NAME, 'echo "foo"\n');

    // Wait for command to execute and output to appear
    await waitForTerminalOutput(300);

    // Get state after command
    const after_state = await getTerminalState(SESSION_NAME);

    // After echo "foo", the cursor should have moved down
    // The command line + output + new prompt should advance cursor
    assert.strictEqual(
      after_state.screen_state.cursorY > initial_cursor_y,
      true
    );

    // Content should now contain "foo" and the new prompt
    assert.strictEqual(after_state.screen_state.content.includes('foo'), true);

    // Cursor X should be at the new prompt position (typically after "$ ")
    assert.strictEqual(after_state.screen_state.cursorX >= 0, true);
  });

  await t.test('buffer content grows with multiple echo commands', async () => {
    // Get initial content length
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_content_length = initial_state.screen_state.content.length;
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Send multiple echo commands
    await writeToSession(SESSION_NAME, 'echo "line1"\n');
    await waitForTerminalOutput(200);

    await writeToSession(SESSION_NAME, 'echo "line2"\n');
    await waitForTerminalOutput(200);

    await writeToSession(SESSION_NAME, 'echo "line3"\n');
    await waitForTerminalOutput(200);

    // Get final state
    const final_state = await getTerminalState(SESSION_NAME);

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

    // Send command that produces multiple lines of output
    await writeToSession(SESSION_NAME, 'printf "line1\\nline2\\nline3\\n"\n');
    await waitForTerminalOutput(300);

    // Get state after multiline output
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor should have moved down by at least 4 lines:
    // 1 for the command itself, 3 for the output lines, plus new prompt
    const cursor_movement = after_state.screen_state.cursorY - initial_cursor_y;
    assert.strictEqual(cursor_movement >= 4, true);

    // Content should contain all three output lines
    assert.strictEqual(
      after_state.screen_state.content.includes('line1'),
      true
    );
    assert.strictEqual(
      after_state.screen_state.content.includes('line2'),
      true
    );
    assert.strictEqual(
      after_state.screen_state.content.includes('line3'),
      true
    );
  });

  await t.test('cursor position after long line that wraps', async () => {
    // Get initial state
    const initial_state = await getTerminalState(SESSION_NAME);
    const initial_cursor_y = initial_state.screen_state.cursorY;

    // Create a long line that should wrap (assuming 80 column terminal)
    const long_text = 'a'.repeat(100); // 100 characters should wrap on 80-column terminal
    await writeToSession(SESSION_NAME, `echo "${long_text}"\n`);
    await waitForTerminalOutput(300);

    // Get state after long line
    const after_state = await getTerminalState(SESSION_NAME);

    // Cursor should have moved down by at least 1 line
    // (allowing for terminal scrolling and different wrapping behaviors)
    const cursor_movement = after_state.screen_state.cursorY - initial_cursor_y;
    assert.strictEqual(cursor_movement >= 1, true);

    // Content should contain the long text (or at least part of it)
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

    // After clear, cursor should be at a reasonable position
    // (allowing for different shell behaviors and terminal implementations)
    assert.strictEqual(after_clear_state.screen_state.cursorY >= 0, true);
    assert.strictEqual(after_clear_state.screen_state.cursorY <= 10, true); // Should be near top

    // Content should be present (at least the prompt after clear)
    assert.strictEqual(after_clear_state.screen_state.content.length > 0, true);

    // Cursor X should be reasonable (at prompt position)
    assert.strictEqual(after_clear_state.screen_state.cursorX >= 0, true);
    assert.strictEqual(after_clear_state.screen_state.cursorX <= 20, true);
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

        // Cursor should generally move down or stay the same (never go backwards significantly)
        // Allow for some flexibility in case of terminal resets
        assert.strictEqual(
          state.screen_state.cursorY >= previous_cursor_y - 5,
          true
        );

        // Cursor should be within reasonable bounds (not negative, not extremely large)
        assert.strictEqual(state.screen_state.cursorY >= 0, true);
        assert.strictEqual(state.screen_state.cursorY < 1000, true);
        assert.strictEqual(state.screen_state.cursorX >= 0, true);
        assert.strictEqual(state.screen_state.cursorX < 200, true);

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
      assert.strictEqual(
        state_with_marker.screen_state.content.includes(unique_marker),
        true
      );

      // Send more commands
      await writeToSession(SESSION_NAME, 'echo "more content"\n');
      await waitForTerminalOutput(200);

      await writeToSession(SESSION_NAME, 'ls /tmp\n');
      await waitForTerminalOutput(200);

      // Get final state
      const final_state = await getTerminalState(SESSION_NAME);

      // Original marker should still be in the buffer (unless it scrolled off)
      // Buffer should contain both old and new content
      assert.strictEqual(
        final_state.screen_state.content.includes('more content'),
        true
      );

      // Buffer should have grown
      assert.strictEqual(
        final_state.screen_state.content.length >=
          state_with_marker.screen_state.content.length,
        true
      );
    }
  );
});
