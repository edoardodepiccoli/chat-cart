import type {
  AdminGraphqlClient,
  StorefrontApiContext,
} from "@shopify/shopify-app-react-router/server";

import {
  DEFAULT_THEME,
  fontUrl,
  themeModeSchema,
  themeSchema,
  themeStyle,
  type Brand,
  type Theme,
  type ThemeMode,
} from "../../../shared/theme";

const METAFIELD = { namespace: "chat_cart", key: "theme" };

const THEME_QUERY = `#graphql
  query Theme($namespace: String!, $key: String!) {
    currentAppInstallation {
      id
      metafield(namespace: $namespace, key: $key) { jsonValue }
    }
  }`;

const SET_THEME_MUTATION = `#graphql
  mutation SetTheme($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { message }
    }
  }`;

async function readInstallation(graphql: AdminGraphqlClient) {
  const response = await graphql(THEME_QUERY, { variables: METAFIELD });
  const { data } = (await response.json()) as {
    data: {
      currentAppInstallation: {
        id: string;
        metafield: { jsonValue: unknown } | null;
      };
    };
  };

  return data.currentAppInstallation;
}

export async function getTheme(
  graphql: AdminGraphqlClient,
): Promise<{ theme: Theme; mode: ThemeMode }> {
  const { metafield } = await readInstallation(graphql);
  const value = metafield?.jsonValue ?? {};
  const saved = themeSchema.partial().safeParse(value);
  const mode = themeModeSchema.safeParse((value as { mode?: unknown }).mode);

  return {
    theme: { ...DEFAULT_THEME, ...(saved.success ? saved.data : {}) },
    mode: mode.success ? mode.data : "custom",
  };
}

export async function saveTheme(
  graphql: AdminGraphqlClient,
  theme: Theme,
  mode: ThemeMode,
) {
  const { id: ownerId } = await readInstallation(graphql);
  const response = await graphql(SET_THEME_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId,
          ...METAFIELD,
          type: "json",
          value: JSON.stringify({
            ...theme,
            mode,
            style: themeStyle(theme, mode),
            fontUrl: fontUrl([theme.fontFamily]),
          }),
        },
      ],
    },
  });
  const { data } = (await response.json()) as {
    data: { metafieldsSet: { userErrors: { message: string }[] } };
  };

  const [error] = data.metafieldsSet.userErrors;
  if (error) throw new Error(error.message);
}

const BRAND_QUERY = `#graphql
  query Brand {
    shop {
      brand {
        colors {
          primary { background foreground }
          secondary { background foreground }
        }
      }
    }
  }`;

type BrandColorGroup = { background: string | null; foreground: string | null };

function brandColor(groups: BrandColorGroup[] = []) {
  const [first] = groups;
  if (!first?.background || !first.foreground) return null;
  return { background: first.background, foreground: first.foreground };
}

export async function getBrand(
  storefront: StorefrontApiContext,
): Promise<Brand> {
  const response = await storefront.graphql(BRAND_QUERY);
  const { data } = (await response.json()) as {
    data: {
      shop: {
        brand: {
          colors: {
            primary: BrandColorGroup[];
            secondary: BrandColorGroup[];
          };
        } | null;
      };
    };
  };
  const colors = data.shop.brand?.colors;

  return {
    primary: brandColor(colors?.primary),
    secondary: brandColor(colors?.secondary),
  };
}
