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
        files(
          filenames: ["config/settings_schema.json", "config/settings_data.json"]
          first: 2
        ) {
          nodes {
            filename
            body { ... on OnlineStoreThemeFileBodyText { content } }
          }
        }
      }
    }
  }`;

type Settings = Record<string, unknown>;

function parseThemeJson(content: string) {
  return JSON.parse(content.replace(/^\s*\/\*[\s\S]*?\*\//, ""));
}

function storeSettings(schemaFile: string, dataFile: string): Settings {
  const schema = parseThemeJson(schemaFile) as {
    settings?: { id?: string; default?: unknown }[];
  }[];
  const data = parseThemeJson(dataFile) as {
    current: Settings | string;
    presets?: Record<string, Settings>;
  };

  const defaults = schema
    .flatMap((group) => group.settings ?? [])
    .filter((setting) => setting.id && setting.default !== undefined)
    .map((setting) => [setting.id, setting.default]);
  const current =
    typeof data.current === "string"
      ? data.presets?.[data.current]
      : data.current;
  const settings: Settings = { ...Object.fromEntries(defaults), ...current };

  function resolve(value: unknown): unknown {
    if (typeof value === "string") {
      const path = value.match(/^\{\{\s*settings\.([\w.]+)\s*\}\}$/)?.[1];
      if (!path) return value;
      return resolve(
        path
          .split(".")
          .reduce<unknown>(
            (parent, key) => (parent as Settings)?.[key],
            settings,
          ),
      );
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, resolve(item)]),
      );
    return value;
  }

  return resolve(settings) as Settings;
}

const GENERATE = `You design the theme of a chat widget embedded in a Shopify storefront, so it looks on brand with the store.
You get the effective settings of the store's published theme: the defaults from config/settings_schema.json with the saved values from config/settings_data.json on top, and references to other settings already resolved. Read its colors, color schemes, fonts, corner radius, borders and shadows, and pick every widget token so the widget looks like part of the store.

Colors, as #rrggbb:
${COLOR_GROUPS.flatMap((group) =>
  group.fields.map(
    (field) => `- ${field.name}: ${field.label}. ${field.details}`,
  ),
).join("\n")}

Each of these pairs needs at least 4.5:1 contrast:
${CONTRAST_PAIRS.map((pair) => `- ${pair.text} on ${pair.background}`).join("\n")}

Shape, spacing and depth:
- radius: corner radius in px, 0 to 24
- borderWidth: border width in px, 0 to 2
- buttonShape: rounded (follows radius) or pill
- suggestionShape: rounded (follows radius) or pill, for suggested replies
- shadow: none, soft or strong
- spacing: compact, comfortable or spacious, scales padding and gaps in messages, cards, buttons and fields. Follow the theme's spacing and padding settings

Fonts, as family names (letters, digits and spaces):
- bodyFont: messages, buttons and fields. Empty inherits the storefront's font
- headingFont: product, FAQ and cart titles. Empty uses bodyFont
- fontSize: base text size in px, 12 to 18. Small text is 2px less. Scale it with the theme's body text scale, 14 is the default

Font weights, 300 to 700 in steps of 100:
- bodyWeight: messages and fields
- headingWeight: product, FAQ and cart titles
- buttonWeight: buttons

Text style:
- headingCase, buttonCase: none, uppercase or capitalize, for titles and buttons
- headingLetterSpacing, buttonLetterSpacing: letter spacing in px, -1 to 4 in steps of 0.5
Look for text transform, capitalization and letter spacing settings for headings and buttons. Uppercase text usually comes with 1 to 2px of letter spacing.
Font settings (e.g. type_body_font, type_header_font) are Shopify font handles: assistant_n4 is family "Assistant" at weight 400, playfair_display_i7 is "Playfair Display" italic at 700. Turn underscores into spaces and write the name as Google Fonts spells it, capitalized: red_hat_text_n4 is "Red Hat Text", dm_sans_n5 is "DM Sans", never lowercase. Always write the exact family names from the theme, and take bodyWeight and headingWeight from the handles, rounded into 300 to 700. Take buttonWeight from the font the theme sets for buttons. When no setting names one, buttons use the body font at its weight.`;

export async function generateTheme(
  graphql: AdminGraphqlClient,
): Promise<Theme> {
  const response = await graphql(STORE_THEME_QUERY);
  const { data } = (await response.json()) as {
    data: {
      themes: {
        nodes: {
          name: string;
          files: {
            nodes: { filename: string; body: { content?: string } }[];
          };
        }[];
      };
    };
  };

  const [theme] = data.themes.nodes;
  const file = (filename: string) =>
    theme?.files.nodes.find((node) => node.filename === filename)?.body.content;
  const schemaFile = file("config/settings_schema.json");
  const dataFile = file("config/settings_data.json");
  if (!schemaFile || !dataFile) throw new Error("No published theme settings");

  const settings = storeSettings(schemaFile, dataFile);

  const { output } = await generateText({
    model: DEEPSEEK,
    system: GENERATE,
    output: Output.object({ schema: themeSchema }),
    prompt: `Theme: ${theme.name}\n\n${JSON.stringify(settings)}`,
  });

  return output;
}
