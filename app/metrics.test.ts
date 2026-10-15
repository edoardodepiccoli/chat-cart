import { expect, it } from "vitest";
import { countFunnel } from "./metrics.server";

it("counts each conversation once per step", () => {
  const c = (roles: string[], types: string[]) => ({
    messages: roles.map((role) => ({ role })),
    events: types.map((type) => ({ type })),
  });
  expect(
    countFunnel([
      c([], []),
      c(["user", "assistant"], ["widget_opened", "widget_opened"]),
      c(["user"], ["widget_opened", "product_clicked", "product_clicked"]),
      c([], ["teaser_shown", "teaser_clicked"]),
    ]),
  ).toEqual({
    loads: 4,
    opened: 2,
    engaged: 2,
    clickedThrough: 1,
    teaserShown: 1,
    teaserClicked: 1,
  });
});
