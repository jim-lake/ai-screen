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

  const { Session } = await import('../src/lib/session');

  await t.test('should create a new session', () => {
    const SessionParams = {
      name: 'test-session',
      shell: '/bin/bash',
      cwd: '/tmp',
      rows: 24,
      columns: 80,
      env: {},
    };
    const session = new Session(SessionParams);
    assert.strictEqual(session.name, 'test-session');
    assert.deepStrictEqual(session.terminals, []);
  });

  await t.test('should create a new terminal in a session', () => {
    const SessionParams = {
      name: 'test-session2',
      shell: '/bin/bash',
      cwd: '/tmp',
      rows: 24,
      columns: 80,
      env: {},
    };
    const session = new Session(SessionParams);
    const terminal = session.createTerminal();
    assert.strictEqual(session.terminals.length, 1);
    assert.strictEqual(session.terminals[0], terminal);
  });
});
