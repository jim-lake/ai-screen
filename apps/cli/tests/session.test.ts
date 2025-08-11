import { test } from 'node:test';
import assert from 'node:assert';

import pty from 'node-pty';

void test('Session class', async (t) => {
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
  const { Session } = await import('../src/lib/session');

  await t.test('should create a new session', () => {
    const session = new Session('test-session');
    assert.strictEqual(session.name, 'test-session');
    assert.deepStrictEqual(session.terminals, []);
  });

  await t.test('should create a new terminal in a session', () => {
    const session = new Session('test-session2');
    const terminal = session.createTerminal();
    assert.strictEqual(session.terminals.length, 1);
    assert.strictEqual(session.terminals[0], terminal);
  });
});
