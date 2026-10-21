import type { ResolvedContext, ResolvedPage } from "../context.server";

function pageLine(page: ResolvedPage) {
  switch (page.type) {
    case "product":
      return `The shopper is on the page of the product "${page.title}" with handle "${page.handle}". When they say "this" or "it", or ask about a product without naming it, they mean this one: look it up with getProduct using this handle.`;
    case "collection":
      return `The shopper is on the page of the collection "${page.title}" with handle "${page.handle}". When they say "this" or "here", or ask for products without naming a range, they mean the products of this collection: look them up with listProducts using the collection filter.`;
    case "search":
      return `The shopper is on a search results page, and searched for "${page.terms}". Treat that as what they are looking for.`;
    default:
      return "";
  }
}

export function contextPrompt(context: ResolvedContext) {
  return [
    context.country &&
      `The shopper is shopping from ${context.country}, and prices are in that market's currency. Any price in another currency earlier in the conversation is outdated: look it up again before you use it.`,
    pageLine(context.page),
  ]
    .filter(Boolean)
    .join("\n\n");
}
