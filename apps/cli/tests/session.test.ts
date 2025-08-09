import { test } from "node:test";
import assert from "node:assert";

import pty from "node-pty";

void test("Session class", async (t) => {
  t.mock.module("node-pty", {
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
  const { Session } = await import("../src/session");

  await t.test("should create a new session", () => {
    const session = new Session("test-session");
    assert.strictEqual(session.name, "test-session");
    assert.deepStrictEqual(session.windows, []);
  });

  await t.test("should create a new window in a session", () => {
    const session = new Session("test-session");
    const window = session.createWindow();
    assert.strictEqual(session.windows.length, 1);
    assert.strictEqual(session.windows[0], window);
  });
});
