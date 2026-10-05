import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { generateText, Output } from "ai";
import { z } from "zod";

import { DEEPSEEK } from "../../agent/agent.server";
import {
  DEFAULT_THEME,
  fontUrls,
  themeSchema,
  themeStyle,
  type Theme,
} from "../../../shared/theme";
import { COLOR_GROUPS, CONTRAST_PAIRS } from "./fields";

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
            fontUrls: fontUrls(theme),
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

const STORE_THEME_QUERY = `#graphql
  query StoreTheme {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        name
        files(filenames: ["config/settings_data.json"], first: 1) {
          nodes { body { ... on OnlineStoreThemeFileBodyText { content } } }
        }
      }
    }
  }`;

const GENERATE = `You design the theme of a chat widget embedded in a Shopify storefront, so it looks on brand with the store.
You get the settings of the store's published theme (config/settings_data.json). Read its colors, color schemes, fonts, corner radius, borders and shadows, and pick every widget token so the widget looks like part of the store.

Colors, as #rrggbb:
${COLOR_GROUPS.flatMap((group) =>
  group.fields.map(
    (field) => `- ${field.name}: ${field.label}. ${field.details}`,
  ),
).join("\n")}

Each of these pairs needs at least 4.5:1 contrast:
${CONTRAST_PAIRS.map((pair) => `- ${pair.text} on ${pair.background}`).join("\n")}

Shape and depth:
- radius: corner radius in px, 0 to 24
- borderWidth: border width in px, 0 to 2
- buttonShape: rounded (follows radius) or pill
- suggestionShape: rounded (follows radius) or pill, for suggested replies
- shadow: none, soft or strong

Fonts, as family names (letters, digits and spaces):
- bodyFont: messages, buttons and fields. Empty inherits the storefront's font
- headingFont: product, FAQ and cart titles. Empty uses bodyFont

Font weights, 300 to 700 in steps of 100:
- bodyWeight: messages and fields
- headingWeight: product, FAQ and cart titles
- buttonWeight: buttons

Text style:
- headingCase, buttonCase: none, uppercase or capitalize, for titles and buttons
- headingLetterSpacing, buttonLetterSpacing: letter spacing in px, -1 to 4 in steps of 0.5
Look for text transform, capitalization and letter spacing settings for headings and buttons. Uppercase text usually comes with 1 to 2px of letter spacing.
Font settings (e.g. type_body_font, type_header_font) are Shopify font handles: assistant_n4 is family "Assistant" at weight 400, playfair_display_i7 is "Playfair Display" italic at 700. Turn underscores into spaces and title case the name. Always write the exact family names from the theme, and take bodyWeight and headingWeight from the handles. Buttons usually follow the body font, slightly bolder.`;

export async function generateTheme(
  graphql: AdminGraphqlClient,
): Promise<Theme> {
  const response = await graphql(STORE_THEME_QUERY);
  const { data } = (await response.json()) as {
    data: {
      themes: {
        nodes: {
          name: string;
          files: { nodes: { body: { content?: string } }[] };
        }[];
      };
    };
  };

  const [theme] = data.themes.nodes;
  const settings = theme?.files.nodes[0]?.body.content;
  if (!settings) throw new Error("No published theme settings");

  const { output } = await generateText({
    model: DEEPSEEK,
    system: GENERATE,
    output: Output.object({ schema: themeSchema }),
    prompt: `Theme: ${theme.name}\n\n${settings}`,
  });

  return output;
}
