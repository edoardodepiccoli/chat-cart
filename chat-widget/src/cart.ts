export async function addToCart(variantId: string) {
  const id = Number(variantId.split("/").at(-1));
  const response = await fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ id, quantity: 1 }] }),
  });
  if (!response.ok) throw new Error(`Cart ${response.status}`);
}
