import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import { generateText, Output } from "ai";
import { z } from "zod";

import { DEEPSEEK } from "../../agent/agent.server";
import {
  DEFAULT_THEME,
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
          value: JSON.stringify({ theme, style: themeStyle(theme) }),
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

const GENERATE = `You pick the colors of a chat widget embedded in a Shopify storefront, so it looks on brand with the store.
You get the effective settings of the store's published theme: the defaults from config/settings_schema.json with the saved values from config/settings_data.json on top, and references to other settings already resolved. Read its colors and color schemes, and pick every widget color so the widget looks like part of the store.

Colors, as #rrggbb:
${COLOR_GROUPS.flatMap((group) =>
  group.fields.map(
    (field) => `- ${field.name}: ${field.label}. ${field.details}`,
  ),
).join("\n")}

Each of these pairs needs at least 4.5:1 contrast:
${CONTRAST_PAIRS.map((pair) => `- ${pair.text} on ${pair.background}`).join("\n")}`;

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
