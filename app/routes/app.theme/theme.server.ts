import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { z } from "zod";

import {
  DEFAULT_THEME,
  fontUrl,
  themeSchema,
  themeStyle,
  type Theme,
} from "../../../shared/theme";

const METAFIELD = { namespace: "chat_cart", key: "theme" };

const savedSchema = z.object({
  theme: themeSchema.partial().optional(),
});

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
  const saved = savedSchema.safeParse(metafield?.jsonValue);

  return { ...DEFAULT_THEME, ...saved.data?.theme };
}

export async function saveTheme(graphql: AdminGraphqlClient, theme: Theme) {
  const { id: ownerId } = await readInstallation(graphql);
  const response = await graphql(SET_THEME_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId,
          ...METAFIELD,
          type: "json",
          value: JSON.stringify({
            theme,
            style: themeStyle(theme),
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
