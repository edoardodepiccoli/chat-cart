import { z } from "zod";

import {
  samePage,
  visitSchema,
  type PageContext,
  type ShopperContext,
  type Visit,
} from "../../shared/context";

const HISTORY_KEY = "chat-cart:history";
const HISTORY_LIMIT = 10;

let country = "";
let language = "";
let page: PageContext = { type: "other" };
let previousHistory: Visit[] = [];

const MAX_LENGTH = 200;

function fits(value: string | undefined): value is string {
  return !!value && value.length <= MAX_LENGTH;
}

export function pageFromDataset(dataset: DOMStringMap): PageContext {
  const { pageType, productHandle, collectionHandle, searchTerms } = dataset;
  if (pageType === "product" && fits(productHandle)) {
    return { type: "product", handle: productHandle };
  }
  if (pageType === "collection" && fits(collectionHandle)) {
    return { type: "collection", handle: collectionHandle };
  }
  if (pageType === "search" && fits(searchTerms)) {
    return { type: "search", terms: searchTerms };
  }
  return { type: "other" };
}

export function addVisit(
  history: Visit[],
  current: PageContext,
  at: number,
): Visit[] {
  if (current.type === "other") return history;
  const last = history[history.length - 1];
  const rest = last && samePage(last, current) ? history.slice(0, -1) : history;
  return [...rest, { ...current, at }].slice(-HISTORY_LIMIT);
}

export function readHistory(storage: Storage | undefined): Visit[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = z.array(visitSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.slice(-HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function getStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function recordVisit(
  current: PageContext,
  storage: Storage | undefined = getStorage(),
) {
  previousHistory = readHistory(storage);
  if (current.type === "other") return;
  try {
    storage?.setItem(
      HISTORY_KEY,
      JSON.stringify(addVisit(previousHistory, current, Date.now())),
    );
  } catch {
    // storage unavailable
  }
}

export function setShopperContext(value: {
  country: string;
  language: string;
  page: PageContext;
}) {
  country = value.country;
  language = value.language;
  page = value.page;
}

export function getShopperContext(): ShopperContext {
  return { country, language, page, history: previousHistory };
}
