import type { Cart } from "./cart";

// Shopify's standard storefront events
// (https://cdn.shopify.com/storefront/standard-events.js). Themes such as
// Horizon listen for this one on `document` and refresh their cart icon and
// cart drawer from `event.promise`.
export const CART_LINES_UPDATE = "shopify:cart:lines-update";

type Money = { amount: string; currencyCode: string };

export type StandardCart = {
  id: string;
  totalQuantity: number;
  cost: { totalAmount: Money };
  lines: { id: string; quantity: number; cost: { totalAmount: Money } }[];
  discountCodes: { applicable: boolean; code: string }[];
};

// Cents to a plain decimal string with the currency's minor digits, as the
// standard events module does ("129.00" for EUR, "1500" for JPY).
function amount(cents: number, currency: string): string {
  const { maximumFractionDigits: digits } = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions();
  return new Intl.NumberFormat("en", {
    style: "decimal",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(cents / 100);
}

// A port of the module's createCartFromAjaxResponse. Our AJAX cart type
// carries no discount codes, so the list is always empty.
export function toStandardCart(cart: Cart): StandardCart {
  const money = (cents: number): Money => ({
    amount: amount(cents, cart.currency),
    currencyCode: cart.currency,
  });
  return {
    id: `gid://shopify/Cart/${cart.token}`,
    totalQuantity: cart.item_count,
    cost: { totalAmount: money(cart.total_price) },
    lines: cart.items.map((item) => ({
      // The raw AJAX line key, as the module and Horizon use it.
      id: item.key,
      quantity: item.quantity,
      cost: { totalAmount: money(item.final_line_price) },
    })),
    discountCodes: [],
  };
}

// Horizon's cart items re-render from `detail.sections[data-section-id]`
// when present, so ask Shopify to render the ones on this page.
export function horizonSections(): string[] {
  const ids = Array.from(
    document.querySelectorAll("cart-items-component[data-section-id]"),
    (element) => element.getAttribute("data-section-id") ?? "",
  );
  return [...new Set(ids)].filter(Boolean);
}

export function notifyTheme(
  cart: Cart,
  sections: Record<string, string | null>,
): void {
  // Always "update", never "add": Horizon opens its cart drawer on adds,
  // and a chat write should refresh the theme silently.
  // Everything is built inside the try: an unknown currency makes
  // Intl.NumberFormat throw, and neither that nor a broken theme listener
  // may stop the widget from showing a cart Shopify confirmed.
  try {
    const event = Object.assign(
      new Event(CART_LINES_UPDATE, { bubbles: true, cancelable: true }),
      {
        action: "update",
        context: "chat",
        // Every line in the cart, by raw key, with its absolute quantity
        // (not only the lines this write touched).
        lines: cart.items.map((item) => ({
          id: item.key,
          quantity: item.quantity,
        })),
        promise: Promise.resolve({
          cart: toStandardCart(cart),
          // Without `items`, Horizon's product form re-reads /cart.json.
          detail: {
            sections,
            itemCount: cart.item_count,
            items: cart.items,
          },
        }),
      },
    );
    document.dispatchEvent(event);
  } catch (error) {
    console.error(error);
  }
}
