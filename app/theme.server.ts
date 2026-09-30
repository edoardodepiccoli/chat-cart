import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const themeSchema = z.object({
  primary: hex,
  onPrimary: hex,
  radius: z.coerce.number().int().min(0).max(24),
});

export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  primary: "#1a1a1a",
  onPrimary: "#ffffff",
  radius: 12,
};

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

export async function getTheme(graphql: AdminGraphqlClient): Promise<Theme> {
  const { metafield } = await readInstallation(graphql);
  const saved = themeSchema.partial().safeParse(metafield?.jsonValue ?? {});

  return { ...DEFAULT_THEME, ...(saved.success ? saved.data : {}) };
}

export async function saveTheme(graphql: AdminGraphqlClient, theme: Theme) {
  const { id: ownerId } = await readInstallation(graphql);
  const response = await graphql(SET_THEME_MUTATION, {
    variables: {
      metafields: [
        { ownerId, ...METAFIELD, type: "json", value: JSON.stringify(theme) },
      ],
    },
  });
  const { data } = (await response.json()) as {
    data: { metafieldsSet: { userErrors: { message: string }[] } };
  };

  const [error] = data.metafieldsSet.userErrors;
  if (error) throw new Error(error.message);
}
