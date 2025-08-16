import { test } from 'node:test';
import assert from 'node:assert';
import pty from 'node-pty';

void test('Terminal class', async (t) => {
  t.mock.module('node-pty', {
    namedExports: {
      ...pty,
      spawn() {
        return {
          resize() {
            // Mock implementation
          },
          onData() {
            return {
              dispose() {
                // Mock implementation
              },
            };
          },
          onExit() {
            return {
              dispose() {
                // Mock implementation
              },
            };
          },
        };
      },
    },
  });

  const { Terminal } = await import('../src/lib/terminal');

  await t.test('should create a new terminal', () => {
    const TerminalParams = {
      shell: '/bin/bash',
      cwd: '/tmp',
      rows: 24,
      columns: 80,
      env: {},
    };
    const terminal = new Terminal(TerminalParams);
    assert.strictEqual(terminal.id, 1);
    assert.ok(terminal.pty);
  });
});
