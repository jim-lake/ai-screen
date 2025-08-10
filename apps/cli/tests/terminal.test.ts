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
            void 0;
          },
          on() {
            void 0;
          },
        };
      },
    },
  });
  const { Terminal } = await import('../src/terminal');

  await t.test('should create a new terminal', () => {
    const terminal = new Terminal(0);
    assert.strictEqual(terminal.id, 0);
    assert.ok(terminal.process);
  });
});
