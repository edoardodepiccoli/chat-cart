import type { StorefrontApiContext } from "@shopify/shopify-app-react-router/server";

import type {
  ProductCardProps,
  ProductOption,
} from "../../chat-widget/src/components/ProductCard";

const PRODUCTS_QUERY = `#graphql
  query Products {
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
        options { name optionValues { name } }
      }
    }
  }`;

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      handle
      title
      description
      tags
      featuredImage { url altText }
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

type Money = { amount: string; currencyCode: string };

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
      options: OptionNode[];
    }[];
  };
};

type ProductResponse = {
  product: {
    handle: string;
    title: string;
    description: string;
    tags: string[];
    featuredImage: { url: string; altText: string | null } | null;
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

type ProductSummary = {
  handle: string;
  title: string;
  description: string;
  tags: string[];
  price: { min: string; max: string; currencyCode: string };
  available: boolean;
  options: ProductOption[];
};

type ProductDetails = ProductCardProps & {
  description: string;
  tags: string[];
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

export async function listProducts(
  storefront: StorefrontApiContext,
): Promise<ProductSummary[]> {
  const response = await storefront.graphql(PRODUCTS_QUERY);
  const { data } = (await response.json()) as { data: ProductsResponse };

  return data.products.nodes.map((product) => ({
    handle: product.handle,
    title: product.title,
    description: product.description.slice(0, 150),
    tags: product.tags,
    price: {
      min: product.priceRange.minVariantPrice.amount,
      max: product.priceRange.maxVariantPrice.amount,
      currencyCode: product.priceRange.minVariantPrice.currencyCode,
    },
    available: product.availableForSale,
    options: options(product.options),
  }));
}

export async function getProduct(
  storefront: StorefrontApiContext,
  handle: string,
): Promise<ProductDetails | null> {
  const response = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle },
  });
  const { data } = (await response.json()) as { data: ProductResponse };

  const product = data.product;
  if (!product) return null;

  return {
    handle: product.handle,
    title: product.title,
    description: product.description,
    tags: product.tags,
    imageUrl: product.featuredImage?.url ?? null,
    imageAlt: product.featuredImage?.altText ?? null,
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
