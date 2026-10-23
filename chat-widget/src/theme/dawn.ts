import type { Sections, ThemeAdapter } from "./adapter";
import { swapFromHtml, type SwapTarget } from "./swap";

// Dawn and its family (Sense, Craft, Refresh, ...) ignore the standard cart
// event. They refresh the drawer and cart page items from their own pubsub
// (assets/pubsub.js), which leaves the header count and the cart page footer
// alone, so the adapter swaps those two from Shopify's rendered sections.

const BUBBLE = "cart-icon-bubble";

// Section id to the element it refreshes, for the sections on this page.
function targets(): Record<string, SwapTarget> {
  const byId: Record<string, SwapTarget> = {
    [BUBBLE]: { live: "#cart-icon-bubble", fresh: ".shopify-section" },
  };
  const footer = document.getElementById("main-cart-footer")?.dataset.id;
  if (footer) {
    byId[footer] = {
      live: "#main-cart-footer .js-contents",
      fresh: ".js-contents",
    };
  }
  return byId;
}

async function fetchSections(ids: string[]): Promise<Sections> {
  // Rendered in this page's context, as the write's `sections_url` asks:
  // Shopify answers null for a section not on the requested page.
  const response = await fetch(
    `${location.pathname}?sections=${ids.join(",")}`,
  );
  if (!response.ok) throw new Error(`sections answered ${response.status}`);
  return response.json();
}

let warned = false;

export const dawnAdapter: ThemeAdapter = {
  name: "dawn",
  detect: () =>
    typeof window.publish === "function" &&
    document.getElementById(BUBBLE) !== null,
  sections: () => Object.keys(targets()),
  async refresh({ cart, sections }) {
    try {
      const byId = targets();
      const ids = Object.keys(byId);
      // A failed write that still changed the cart brings no section HTML.
      const html = ids.some((id) => id in sections)
        ? sections
        : await fetchSections(ids);
      for (const id of ids) {
        const markup = html[id];
        if (typeof markup !== "string") continue;
        const missing = swapFromHtml(markup, [byId[id]]);
        if (missing.length && !warned) {
          warned = true;
          console.warn(
            `[chat-cart] Dawn cart element not found: ${missing[0].live}`,
          );
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      // Dawn toggles these after its own writes, not in its pubsub
      // subscribers, so a chat write that fills or empties the cart would
      // leave the page and drawer in the old state.
      const empty = cart.item_count === 0;
      for (const selector of [
        "cart-items",
        "#main-cart-footer",
        "cart-drawer",
      ]) {
        document.querySelector(selector)?.classList.toggle("is-empty", empty);
      }
      // Dawn's drawer and cart page items re-render from this, without opening.
      window.publish?.("cart-update", { source: "chat-cart", cartData: cart });
    }
  },
};
