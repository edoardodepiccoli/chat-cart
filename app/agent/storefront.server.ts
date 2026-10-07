import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type { Market } from "../../shared/chat";
import { same, type Money, type ProductOption } from "../../shared/product";

const PRODUCTS_QUERY = `#graphql
  query Products($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    products(first: 250) {
      nodes {
        handle
        title
        description
        tags
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
                  same(selected.name, option.name) &&
                  same(selected.value, value),
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
        (filter.minPrice === undefined ||
          Number(product.price.max) >= filter.minPrice) &&
        (filter.maxPrice === undefined ||
          Number(product.price.min) <= filter.maxPrice) &&
        (!filter.option ||
          product.options.some(
            (option) =>
              same(option.name, filter.option!.name) &&
              option.inStock.some((value) => same(value, filter.option!.value)),
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

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function storePages(
  storefront: StorefrontApiContext,
  market: Market,
) {
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
