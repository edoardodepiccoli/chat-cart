import { useEffect, useState } from "react";

import type { ChatEvent } from "../../shared/chat";
import type { Product, ProductVariant } from "../../shared/product";

declare global {
  interface Window {
    Shopify?: { routes?: { root?: string } };
  }
}

const ROOT =
  (typeof window !== "undefined" && window.Shopify?.routes?.root) || "/";

export const CHECKOUT_URL = `${ROOT}checkout`;

export function productUrl(handle: string) {
  return `${ROOT}products/${handle}`;
}

export function localUrl(path: string) {
  return ROOT + path.replace(/^\//, "");
}

export type CartItem = {
  key: string;
  variant_id: number;
  product_title: string;
  image: string | null;
  url: string;
  quantity: number;
  final_line_price: number;
  options_with_values: { name: string; value: string }[];
  product_has_only_default_variant: boolean;
};

export type Cart = {
  items: CartItem[];
  total_price: number;
  currency: string;
};

export function variantNumber(variantId: string) {
  return Number(variantId.split("/").at(-1));
}

export async function addToCart(variantId: string) {
  const response = await fetch(`${ROOT}cart/add.js`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: variantNumber(variantId), quantity: 1 }],
    }),
  });
  if (!response.ok) throw new Error(`Cart ${response.status}`);
}

export async function getCart(): Promise<Cart> {
  const response = await fetch(`${ROOT}cart.js`);
  if (!response.ok) throw new Error(`Cart ${response.status}`);
  return response.json();
}

export function useCart(record: (event: ChatEvent) => void) {
  const [cart, setCart] = useState<Cart>();

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch(() => {});
  }, []);

  async function add(product: Product, variant: ProductVariant) {
    await addToCart(variant.id);
    record({
      type: "added_to_cart",
      data: {
        handle: product.handle,
        variantId: variant.id,
        price: variant.price,
      },
    });
    setCart(await getCart());
  }

  return { cart, add };
}
