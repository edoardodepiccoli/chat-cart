import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import { sameText, type Money, type ProductOption } from "../../shared/product";

const PRODUCTS_QUERY = `#graphql
  query Products($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    products(first: 250) {
      nodes {
        handle
        title
        description
        tags
        productType
        vendor
        collections(first: 20) { nodes { handle } }
        availableForSale
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        compareAtPriceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        options { name optionValues { name } }
        variants(first: 250) {
          nodes {
            availableForSale
            selectedOptions { name value }
          }
        }
      }
    }
  }`;

type OptionNode = { name: string; optionValues: { name: string }[] };

type ProductsResponse = {
  products: {
    nodes: {
      handle: string;
      title: string;
      description: string;
      tags: string[];
      productType: string;
      vendor: string;
      collections: { nodes: { handle: string }[] };
      availableForSale: boolean;
      priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
      compareAtPriceRange: { minVariantPrice: Money; maxVariantPrice: Money };
      options: OptionNode[];
      variants: {
        nodes: {
          availableForSale: boolean;
          selectedOptions: { name: string; value: string }[];
        }[];
      };
    }[];
  };
};

const PRODUCT_QUERY = `#graphql
  query Product(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      handle
      title
      description
      tags
      images(first: 20) { nodes { url altText } }
      options { name optionValues { name } }
      variants(first: 250) {
        nodes {
          id
          availableForSale
          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          image { url }
        }
      }
    }
  }`;

type ProductResponse = {
  product: {
    handle: string;
    title: string;
    description: string;
    tags: string[];
    images: { nodes: { url: string; altText: string | null }[] };
    options: OptionNode[];
    variants: {
      nodes: {
        id: string;
        availableForSale: boolean;
        selectedOptions: { name: string; value: string }[];
        price: Money;
        compareAtPrice: Money | null;
        image: { url: string } | null;
      }[];
    };
  } | null;
};

const STORE_PAGES_QUERY = `#graphql
  query StorePages($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy { handle title body url }
      refundPolicy { handle title body url }
      shippingPolicy { handle title body url }
      termsOfService { handle title body url }
      subscriptionPolicy { handle title body url }
    }
    pages(first: 250) {
      nodes { handle title body onlineStoreUrl }
    }
  }`;

type PolicyNode = {
  handle: string;
  title: string;
  body: string;
  url: string;
} | null;

type StorePagesResponse = {
  shop: {
    privacyPolicy: PolicyNode;
    refundPolicy: PolicyNode;
    shippingPolicy: PolicyNode;
    termsOfService: PolicyNode;
    subscriptionPolicy: PolicyNode;
  };
  pages: {
    nodes: {
      handle: string;
      title: string;
      body: string;
      onlineStoreUrl: string | null;
    }[];
  };
};

function options(nodes: OptionNode[]): ProductOption[] {
  return nodes
    .map((option) => ({
      name: option.name,
      values: option.optionValues.map((value) => value.name),
    }))
    .filter(
      (option) =>
        !(option.name === "Title" && option.values[0] === "Default Title"),
    );
}

export type Market = { country: string; language: string };

function inContext(market: Market) {
  return {
    country: market.country || undefined,
    language: market.language.toUpperCase().replace("-", "_") || undefined,
  };
}

export type ProductFilter = {
  onSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  option?: { name: string; value: string };
  collection?: string;
  productType?: string;
  vendor?: string;
};

export async function listProducts(
  storefront: StorefrontApiContext,
  market: Market,
  filter: ProductFilter = {},
) {
  const response = await storefront.graphql(PRODUCTS_QUERY, {
    variables: inContext(market),
  });
  const { data } = (await response.json()) as { data: ProductsResponse };

  return data.products.nodes
    .map((product) => {
      const { minVariantPrice, maxVariantPrice } = product.priceRange;
      const compareAt = product.compareAtPriceRange;
      const onSale =
        Number(compareAt.maxVariantPrice.amount) >
        Number(minVariantPrice.amount);
      const inStock = product.variants.nodes.filter(
        (variant) => variant.availableForSale,
      );

      return {
        handle: product.handle,
        title: product.title,
        description: product.description.slice(0, 150),
        tags: product.tags,
        productType: product.productType,
        vendor: product.vendor,
        collections: product.collections.nodes.map(({ handle }) => handle),
        price: {
          min: minVariantPrice.amount,
          max: maxVariantPrice.amount,
          currencyCode: minVariantPrice.currencyCode,
        },
        onSale,
        compareAtPrice: onSale
          ? {
              min: compareAt.minVariantPrice.amount,
              max: compareAt.maxVariantPrice.amount,
            }
          : null,
        available: product.availableForSale,
        options: options(product.options).map((option) => ({
          ...option,
          inStock: option.values.filter((value) =>
            inStock.some((variant) =>
              variant.selectedOptions.some(
                (selected) =>
                  sameText(selected.name, option.name) &&
                  sameText(selected.value, value),
              ),
            ),
          ),
        })),
      };
    })
    .filter(
      (product) =>
        (!filter.onSale || product.onSale) &&
        (!filter.availableOnly || product.available) &&
        (!filter.productType ||
          sameText(product.productType, filter.productType)) &&
        (!filter.vendor || sameText(product.vendor, filter.vendor)) &&
        (!filter.collection ||
          product.collections.some((handle) =>
            sameText(handle, filter.collection!),
          )) &&
        (filter.minPrice === undefined ||
          Number(product.price.max) >= filter.minPrice) &&
        (filter.maxPrice === undefined ||
          Number(product.price.min) <= filter.maxPrice) &&
        (!filter.option ||
          product.options.some(
            (option) =>
              sameText(option.name, filter.option!.name) &&
              option.inStock.some((value) =>
                sameText(value, filter.option!.value),
              ),
          )),
    );
}

export async function getProduct(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
) {
  const response = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle, ...inContext(market) },
  });
  const { data } = (await response.json()) as { data: ProductResponse };

  const product = data.product;
  if (!product) return null;

  return {
    handle: product.handle,
    title: product.title,
    description: product.description,
    tags: product.tags,
    images: product.images.nodes.map(({ url, altText }) => ({
      url,
      alt: altText,
    })),
    options: options(product.options),
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      selectedOptions: variant.selectedOptions,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      available: variant.availableForSale,
      imageUrl: variant.image?.url ?? null,
    })),
  };
}

const COLLECTIONS_QUERY = `#graphql
  query Collections($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    collections(first: 250) {
      nodes { handle title description }
    }
  }`;

type CollectionsResponse = {
  collections: {
    nodes: { handle: string; title: string; description: string }[];
  };
};

export async function listCollections(
  storefront: StorefrontApiContext,
  market: Market,
  loaded?: Awaited<ReturnType<typeof listProducts>>,
) {
  const response = await storefront.graphql(COLLECTIONS_QUERY, {
    variables: inContext(market),
  });
  const { data } = (await response.json()) as { data: CollectionsResponse };
  const products = loaded ?? (await listProducts(storefront, market));

  return data.collections.nodes.map((collection) => ({
    handle: collection.handle,
    title: collection.title,
    description: collection.description.slice(0, 150),
    productCount: products.filter((product) =>
      product.collections.includes(collection.handle),
    ).length,
  }));
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function storePages(storefront: StorefrontApiContext, market: Market) {
  const response = await storefront.graphql(STORE_PAGES_QUERY, {
    variables: inContext(market),
  });
  const { data } = (await response.json()) as { data: StorePagesResponse };

  const policies = Object.values(data.shop)
    .filter((policy) => policy !== null)
    .map((policy) => ({
      handle: policy.handle,
      title: policy.title,
      url: policy.url,
      text: plainText(policy.body),
    }));

  const pages = data.pages.nodes.flatMap((page) =>
    page.onlineStoreUrl
      ? [
          {
            handle: page.handle,
            title: page.title,
            url: page.onlineStoreUrl,
            text: plainText(page.body),
          },
        ]
      : [],
  );

  return [...policies, ...pages];
}

export async function listStorePages(
  storefront: StorefrontApiContext,
  market: Market,
) {
  return (await storePages(storefront, market)).map((page) => ({
    handle: page.handle,
    title: page.title,
    url: page.url,
    summary: page.text.slice(0, 150),
  }));
}

export async function getStorePage(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
) {
  return (
    (await storePages(storefront, market)).find(
      (page) => page.handle === handle,
    ) ?? null
  );
}

const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      title
      description
      products(first: 8) { nodes { handle title description } }
    }
  }`;

type ProductSummaryNode = {
  handle: string;
  title: string;
  description: string;
};

type CollectionResponse = {
  collection: {
    title: string;
    description: string;
    products: { nodes: ProductSummaryNode[] };
  } | null;
};

function summarize({ handle, title, description }: ProductSummaryNode) {
  return { handle, title, description: description.slice(0, 150) };
}

export async function getCollection(
  storefront: StorefrontApiContext,
  market: Market,
  handle: string,
) {
  const response = await storefront.graphql(COLLECTION_QUERY, {
    variables: { handle, ...inContext(market) },
  });
  const { data } = (await response.json()) as { data: CollectionResponse };

  const collection = data.collection;
  if (!collection) return null;

  return {
    title: collection.title,
    description: collection.description.slice(0, 150),
    products: collection.products.nodes.map(summarize),
  };
}

const SEARCH_QUERY = `#graphql
  query Search(
    $terms: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(query: $terms, first: 8, types: PRODUCT) {
      nodes { ... on Product { handle title description } }
    }
  }`;

export async function searchProducts(
  storefront: StorefrontApiContext,
  market: Market,
  terms: string,
) {
  const response = await storefront.graphql(SEARCH_QUERY, {
    variables: { terms, ...inContext(market) },
  });
  const { data } = (await response.json()) as {
    data: { search: { nodes: Partial<ProductSummaryNode>[] } };
  };

  return data.search.nodes
    .filter((node): node is ProductSummaryNode => !!node.handle)
    .map(summarize);
}

type Titled = { handle: string; title: string };

type TitlesResponse = Record<string, Titled | null>;

export async function resolveTitles(
  storefront: StorefrontApiContext,
  market: Market,
  handles: { products: string[]; collections: string[] },
) {
  const fields = [
    ...handles.products.map((_, i) => ["product", `p${i}`] as const),
    ...handles.collections.map((_, i) => ["collection", `c${i}`] as const),
  ];
  const values = [...handles.products, ...handles.collections];
  if (!fields.length) return { products: [], collections: [] };

  const declarations = fields.map(([, alias]) => `$${alias}: String!`);
  const selections = fields.map(
    ([field, alias]) =>
      `${alias}: ${field}(handle: $${alias}) { handle title }`,
  );
  const query = `#graphql
  query Titles(
    $country: CountryCode
    $language: LanguageCode
    ${declarations.join("\n    ")}
  ) @inContext(country: $country, language: $language) {
    ${selections.join("\n    ")}
  }`;

  const response = await storefront.graphql(query, {
    variables: {
      ...inContext(market),
      ...Object.fromEntries(fields.map(([, alias], i) => [alias, values[i]])),
    },
  });
  const { data } = (await response.json()) as { data: TitlesResponse };
  const found = (prefix: string) =>
    fields
      .filter(([, alias]) => alias.startsWith(prefix))
      .flatMap(([, alias]) => data[alias] ?? []);

  return { products: found("p"), collections: found("c") };
}
