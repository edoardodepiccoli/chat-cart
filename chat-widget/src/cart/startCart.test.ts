// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

vi.mock("./intercept", () => ({
  installIntercept: () => {
    throw new Error("cannot patch fetch");
  },
}));

const { cartSnapshot, startCart } = await import("./index");

it("a failing cart setup is reported and leaves an empty cart, without throwing", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => startCart()).not.toThrow();
  expect(error).toHaveBeenCalled();
  expect(cartSnapshot()).toEqual({ cart: null, pending: null, error: null });
  error.mockRestore();
});
