import { test, mock } from "node:test";
import assert from "node:assert";
import * as pty from "node-pty";

test("Window class", async (t) => {
  t.mock.module("node-pty", {
    namedExports: {
      ...pty,
      spawn() {
        return {
          resize: () => {},
          on: () => {},
        };
      },
    },
  });
  const { Window } = await import("../src/window");

  await t.test("should create a new window", () => {
    const window = new Window(0);
    assert.strictEqual(window.id, 0);
    assert.ok(window.process);
  });
});
