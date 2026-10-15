import { parseArgs } from "node:util";

import type { ChatMessage } from "../shared/chat";
import type { ShopperContext } from "../shared/context";
import { listProducts } from "../app/agent/storefront.server";
import { buildTeaserInput, generateTeasers } from "../app/agent/teasers.server";
import prisma from "../app/db.server";
import { storefrontClient } from "./run";

type Case = {
  name: string;
  context: ShopperContext;
  messages?: ChatMessage[];
};

const market = { country: "US", language: "en" };
const at = Date.now();

const CASES: Case[] = [
  {
    name: "product, no history",
    context: {
      ...market,
      page: { type: "product", handle: "" },
      history: [],
    },
  },
  {
    name: "product, history of another product and a search",
    context: {
      ...market,
      page: { type: "product", handle: "" },
      history: [
        { type: "product", handle: "", at },
        { type: "search", terms: "gift", at },
      ],
    },
  },
  {
    name: "collection",
    context: {
      ...market,
      page: { type: "collection", handle: "" },
      history: [],
    },
  },
  {
    name: "search",
    context: {
      ...market,
      page: { type: "search", terms: "serum" },
      history: [],
    },
  },
];

function check(teasers: string[], words: string[]) {
  const failures: string[] = [];
  if (teasers.length !== 3) failures.push(`${teasers.length} teasers`);
  for (const teaser of teasers)
    if (teaser.length > 50) failures.push(`over 50 characters: ${teaser}`);
  if (new Set(teasers.map((teaser) => teaser.toLowerCase())).size !== 3)
    failures.push("not distinct");
  const text = teasers.join(" ").toLowerCase();
  if (!words.some((word) => text.includes(word.toLowerCase())))
    failures.push(`none names ${words.join(" / ")}`);
  return failures;
}

export async function main(argv: string[]): Promise<number> {
  parseArgs({ args: argv, options: {} });

  const storefront = await storefrontClient();
  const products = await listProducts(storefront, market);
  const collections = [
    ...new Set(products.flatMap((product) => product.collections)),
  ];
  if (products.length < 2 || !collections.length) {
    console.log("The store needs at least two products and a collection.");
    return 1;
  }

  const [first, second] = products;
  const cases = CASES.map((item): Case => {
    const { page } = item.context;
    if (page.type === "product")
      return {
        ...item,
        context: {
          ...item.context,
          page: { ...page, handle: first.handle },
          history: item.context.history.map((visit) =>
            visit.type === "product"
              ? { ...visit, handle: second.handle }
              : visit,
          ),
        },
      };
    if (page.type === "collection")
      return {
        ...item,
        context: {
          ...item.context,
          page: { ...page, handle: collections[0] },
        },
      };
    return item;
  });

  let failed = 0;
  for (const { name, context, messages = [] } of cases) {
    let failures: string[];
    let teasers: string[] = [];
    try {
      const input = await buildTeaserInput(storefront, context, messages);
      teasers = await generateTeasers(input);
      const { page } = input.context;
      const words =
        page.type === "other"
          ? []
          : (page.type === "search" ? page.terms : page.title).split(/\s+/);
      failures = check(teasers, words);
    } catch (error) {
      failures = [error instanceof Error ? error.message : String(error)];
    }

    console.log(`${failures.length ? "✗" : "✓"} ${name}`);
    for (const teaser of teasers) console.log(`    ${teaser}`);
    for (const failure of failures) console.log(`    ✗ ${failure}`);
    if (failures.length) failed++;
  }

  await prisma.$disconnect();
  console.log(`\n${cases.length - failed}/${cases.length} cases passed`);
  return failed ? 1 : 0;
}
