import type { ResolvedContext, ResolvedPage } from "../context.server";

function describe(page: Exclude<ResolvedPage, { type: "other" }>) {
  return page.type === "search"
    ? `searched "${page.terms}"`
    : `${page.type === "product" ? "viewed" : "browsed the collection"} "${page.title}"`;
}

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
  const lines = [
    `The shopper is shopping from ${context.country}, and prices are in that market's currency. Any price in another currency earlier in the conversation is outdated: look it up again before you use it.`,
    pageLine(context.page),
  ];
  if (context.history.length)
    lines.push(
      `Before this page, from oldest to newest, the shopper ${context.history.map(describe).join("; ")}. Use this to understand what they are interested in, never to recite it back.`,
    );
  return lines.filter(Boolean).join("\n\n");
}

export function teaserTurnPrompt(page: ResolvedPage) {
  const about =
    page.type === "product" || page.type === "collection"
      ? `the ${page.type} with handle "${page.handle}"`
      : page.type === "search"
        ? `the search for "${page.terms}"`
        : "the current page";
  return `The shopper's last message is a suggested question about ${about}, tapped on purpose. It has priority over everything earlier in the conversation: answer exactly that message, about the current page, looked up with the matching tool. Earlier products and topics matter only if the message names them. Keep what the shopper told you, like size, budget or style.`;
}
