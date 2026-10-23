import type { Cart } from "../cart";

// Section HTML Shopify rendered along with a cart write, by section id. A
// section Shopify could not render is null.
export type Sections = Record<string, string | null>;

export type ThemeUpdate = { cart: Cart; sections: Sections };

// How the widget refreshes one theme's cart UI after its own cart writes.
// Each theme listens differently, so each gets an adapter; the standard cart
// event is sent for every theme before `refresh` runs.
export type ThemeAdapter = {
  name: string;
  // A feature check on the page. Called once, on the first chat write.
  detect(): boolean;
  // Section ids Shopify renders along with each chat write.
  sections(): string[];
  refresh(update: ThemeUpdate): void | Promise<void>;
};

export function pickAdapter(
  adapters: ThemeAdapter[],
): ThemeAdapter | undefined {
  return adapters.find((adapter) => {
    try {
      return adapter.detect();
    } catch {
      return false;
    }
  });
}
