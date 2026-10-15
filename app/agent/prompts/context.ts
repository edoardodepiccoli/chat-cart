export function marketPrompt(country: string) {
  return `The shopper is shopping from ${country}, and prices are in that market's currency. Any price in another currency earlier in the conversation is outdated: look it up again before you use it.`;
}

export function teaserTurnPrompt(productHandle: string) {
  return `The shopper's last message is a suggested question about the product with handle "${productHandle}", tapped on purpose. It has priority over everything earlier in the conversation: answer exactly that message, about this product, looked up with getProduct. Earlier products and topics matter only if the message names them. Keep what the shopper told you, like size, budget or style.`;
}

export function pagePrompt(productHandle: string) {
  return `The shopper is on the page of the product with handle "${productHandle}". When they say "this" or "it", or ask about a product without naming it, they mean this one: look it up with getProduct using this handle.`;
}
