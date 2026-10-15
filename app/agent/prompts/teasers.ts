import type { ResolvedContext, ResolvedPage } from "../context.server";

export type TeaserInput = {
  context: ResolvedContext;
  language: string;
  pageDetails: string;
  chat: string;
};

function describe(page: ResolvedPage) {
  switch (page.type) {
    case "product":
      return `the product page of "${page.title}"`;
    case "collection":
      return `the collection page "${page.title}"`;
    case "search":
      return `the search results page for "${page.terms}"`;
    default:
      return "a page of the store";
  }
}

function visit(page: Exclude<ResolvedPage, { type: "other" }>) {
  return page.type === "search"
    ? `searched "${page.terms}"`
    : `viewed ${page.type === "product" ? "the product" : "the collection"} "${page.title}"`;
}

export function teasersPrompt({
  context,
  language,
  pageDetails,
  chat,
}: TeaserInput) {
  const history = context.history.length
    ? `Before this page, from oldest to newest, I ${context.history.map(visit).join("; ")}.`
    : "I have not looked at anything else yet.";

  return `I'm a shopper in an online store, and I'm on ${describe(context.page)}.${context.country ? ` I'm shopping from ${context.country}.` : ""}

${history}

What this page shows:
${pageDetails || "nothing more"}

My conversation with the store's shopping assistant so far:
${chat || "none yet"}

Write the 3 messages I'd most likely tap to send to the assistant. Anticipate the question I'll have next, before I think of it. Make each one specific to this page and, where they connect, to what I viewed or said earlier, like "Does this serum go with the retinol I viewed?". Give the three different angles, not the same question reworded.

The assistant can only answer from the store's product data and policy pages (shipping, returns, and the like), so only write messages it can answer from that. Never invent facts that aren't in the text above.

Write in first person, in my words, each at most 50 characters. Language: ${language || "English"}.`;
}
