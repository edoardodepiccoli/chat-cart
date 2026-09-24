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

export async function getCartVariantIds(): Promise<number[]> {
  const response = await fetch("/cart.js");
  if (!response.ok) throw new Error(`Cart ${response.status}`);
  const cart: { items: { variant_id: number }[] } = await response.json();
  return cart.items.map((item) => item.variant_id);
}
