import { test } from 'node:test';
import assert from 'node:assert';
import pty from 'node-pty';

void test('Window class', async (t) => {
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
  const { Window } = await import('../src/window');

  await t.test('should create a new window', () => {
    const window = new Window(0);
    assert.strictEqual(window.id, 0);
    assert.ok(window.process);
  });
});
