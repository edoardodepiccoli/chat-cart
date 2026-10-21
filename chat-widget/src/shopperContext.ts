import type { PageContext, ShopperContext } from "../../shared/shopperContext";

let country = "";
let language = "";
let page: PageContext = { type: "other" };

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
  return { country, language, page };
}
