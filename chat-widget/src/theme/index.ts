import type { Cart } from "../cart";
import { pickAdapter, type Sections, type ThemeAdapter } from "./adapter";
import { horizonAdapter } from "./horizon";
import { selectorsAdapter } from "./selectors";
import { dispatchCartUpdate } from "./standardEvent";

// The theme side of cart sync: which adapter refreshes this page's theme
// after a chat write. Nothing here may throw into the cart code.

// In order; the selectors fallback matches every page, so it goes last.
function adapters(selectors: string[]): ThemeAdapter[] {
  return [horizonAdapter, selectorsAdapter(selectors)];
}

let registry = adapters([]);
let picked: { adapter: ThemeAdapter | undefined } | null = null;

export function startTheme(selectors: string[]): void {
  registry = adapters(selectors);
  picked = null;
}

// Picked on first use, not at start: theme scripts may not have run yet.
function adapter(): ThemeAdapter | undefined {
  picked ??= { adapter: pickAdapter(registry) };
  return picked.adapter;
}

export function themeSections(): string[] {
  try {
    return adapter()?.sections() ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function refreshTheme(cart: Cart, sections: Sections): void {
  // Separate blocks: an unknown currency in the event must not stop the
  // adapter, and a broken adapter must not stop the event.
  try {
    dispatchCartUpdate(cart, sections);
  } catch (error) {
    console.error(error);
  }
  try {
    const result = adapter()?.refresh({ cart, sections });
    Promise.resolve(result).catch((error) => console.error(error));
  } catch (error) {
    console.error(error);
  }
}
