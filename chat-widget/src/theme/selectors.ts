import type { ThemeAdapter } from "./adapter";
import { swapFromHtml } from "./swap";

// The theme editor's "Cart elements to refresh" setting, comma-separated.
export function parseSelectors(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean);
}

// The fallback for themes without an adapter: re-fetch the current page and
// copy the merchant's selectors from it. With no selectors it does nothing,
// and the theme only gets the standard cart event.
export function selectorsAdapter(selectors: string[]): ThemeAdapter {
  const targets = selectors.map((selector) => ({
    live: selector,
    fresh: selector,
  }));
  let latest = 0;
  let warned = false;

  return {
    name: "selectors",
    detect: () => true,
    sections: () => [],
    async refresh() {
      if (!targets.length) return;
      const run = ++latest;
      try {
        const response = await fetch(location.href);
        if (!response.ok) throw new Error(`page answered ${response.status}`);
        const html = await response.text();
        // A newer write started its own refresh; its page is the fresher one.
        if (run !== latest) return;
        const missing = swapFromHtml(html, targets);
        if (missing.length && !warned) {
          warned = true;
          console.warn(
            `[chat-cart] these "Cart elements to refresh" selectors matched nothing: ${missing
              .map((target) => target.live)
              .join(", ")}`,
          );
        }
      } catch (error) {
        console.error(error);
      }
    },
  };
}
