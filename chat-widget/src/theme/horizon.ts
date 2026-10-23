import type { ThemeAdapter } from "./adapter";

const CART_ITEMS = "cart-items-component[data-section-id]";

// Horizon and its family listen to the standard cart event and re-render
// their cart items from `detail.sections[data-section-id]`, so the adapter
// only asks Shopify to render the ones on this page.
export const horizonAdapter: ThemeAdapter = {
  name: "horizon",
  detect: () => document.querySelector(CART_ITEMS) !== null,
  sections() {
    const ids = Array.from(
      document.querySelectorAll(CART_ITEMS),
      (element) => element.getAttribute("data-section-id") ?? "",
    );
    return [...new Set(ids)].filter(Boolean);
  },
  refresh() {},
};
