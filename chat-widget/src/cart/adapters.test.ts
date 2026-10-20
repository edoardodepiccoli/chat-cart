import { afterEach, describe, expect, it } from "vitest";

import { THEME_ADAPTERS, pickAdapter } from "./adapters";
import { standardEventsAdapter } from "./standardEvents";
import { noopAdapter } from "./theme";

describe("pickAdapter", () => {
  afterEach(() => {
    delete THEME_ADAPTERS["Test Theme"];
  });

  it("defaults to the standard events adapter", () => {
    expect(pickAdapter(undefined)).toBe(standardEventsAdapter);
    expect(pickAdapter("Horizon")).toBe(standardEventsAdapter);
  });

  it("returns the adapter registered for the theme's schema name", () => {
    THEME_ADAPTERS["Test Theme"] = noopAdapter;
    expect(pickAdapter("Test Theme")).toBe(noopAdapter);
  });
});
