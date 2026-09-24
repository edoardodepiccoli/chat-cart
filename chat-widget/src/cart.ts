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
  const response = await fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: variantNumber(variantId), quantity: 1 }],
    }),
  });
  if (!response.ok) throw new Error(`Cart ${response.status}`);
}

export async function getCart(): Promise<Cart> {
  const response = await fetch("/cart.js");
  if (!response.ok) throw new Error(`Cart ${response.status}`);
  return response.json();
}
