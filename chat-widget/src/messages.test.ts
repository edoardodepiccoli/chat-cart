import { expect, it } from "vitest";

import { groupTurns, typingLabel } from "./messages";

it("starts a turn at every user message", () => {
  const m = (id: string, role: "user" | "assistant") => ({
    id,
    role,
    parts: [],
  });
  expect(
    groupTurns([
      m("g", "assistant"),
      m("u1", "user"),
      m("a1", "assistant"),
      m("u2", "user"),
    ] as never).map((turn) => turn.map((x) => x.id)),
  ).toEqual([["g"], ["u1", "a1"], ["u2"]]);
});

it("labels the running data tool", () => {
  const message = {
    id: "a",
    role: "assistant",
    parts: [
      {
        type: "tool-getStorePage",
        state: "input-available",
        toolCallId: "1",
        input: {},
      },
    ],
  };
  expect(typingLabel(message as never)).toBe("Checking store info");
});
