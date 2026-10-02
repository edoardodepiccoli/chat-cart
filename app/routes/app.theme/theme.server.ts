import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";

import {
  DEFAULT_THEME,
  fontFaces,
  themeStyle,
  type FontFace,
  type Theme,
} from "../../../shared/theme";

const METAFIELD = { namespace: "chat_cart", key: "theme" };

const CHECKOUT_QUERY = `#graphql
  query CheckoutBranding {
    checkoutAndAccountsConfigurations(first: 10) {
      nodes {
        isPublished
        branding {
          designTokens {
            cornerRadius { small base large }
            typography {
              primary {
                ... on CheckoutAndAccountsConfigurationBrandingShopifyFontGroup {
                  name
                  base { sources weight }
                  bold { sources weight }
                }
                ... on CheckoutAndAccountsConfigurationBrandingCustomFontGroup {
                  name
                  base { sources weight }
                  bold { sources weight }
                }
              }
            }
          }
          components {
            shared { colors { accent button } }
            main {
              colors {
                base { background text }
                primaryButton { background text }
              }
            }
          }
        }
      }
    }
  }`;

const INSTALLATION_QUERY = `#graphql
  query Installation {
    currentAppInstallation { id }
  }`;

const SET_THEME_MUTATION = `#graphql
  mutation SetTheme($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { message }
    }
  }`;

type ColorRoles = { background: string | null; text: string | null } | null;

type Branding = {
  designTokens: {
    cornerRadius: {
      small: number | null;
      base: number | null;
      large: number | null;
    } | null;
    typography: {
      primary: {
        name?: string | null;
        base?: FontFace | null;
        bold?: FontFace | null;
      } | null;
    } | null;
  } | null;
  components: {
    shared: {
      colors: { accent: string | null; button: string | null } | null;
    } | null;
    main: {
      colors: { base: ColorRoles; primaryButton: ColorRoles } | null;
    } | null;
  } | null;
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function readable(background: string) {
  return contrast(background, "#ffffff") >= contrast(background, "#1a1a1a")
    ? "#ffffff"
    : "#1a1a1a";
}

function brandingToTheme(branding: Branding | null): Theme {
  const tokens = branding?.designTokens;
  const shared = branding?.components?.shared?.colors;
  const main = branding?.components?.main?.colors;
  const radius = tokens?.cornerRadius;
  const font = tokens?.typography?.primary;
  const defaults = DEFAULT_THEME;

  const background = main?.base?.background ?? defaults.colors.background;
  const text = main?.base?.text ?? readable(background);
  const primary =
    main?.primaryButton?.background ??
    shared?.button ??
    defaults.colors.primary;
  const accent = shared?.accent;
  const faces = [font?.base, font?.bold].filter((face) => face != null);

  return {
    colors: {
      background,
      text,
      primary,
      onPrimary: main?.primaryButton?.text ?? readable(primary),
      secondary: background,
      onSecondary:
        accent && contrast(accent, background) >= 4.5 ? accent : text,
    },
    cornerRadius: {
      small: radius?.small ?? defaults.cornerRadius.small,
      base: radius?.base ?? defaults.cornerRadius.base,
      large: radius?.large ?? defaults.cornerRadius.large,
    },
    font: font?.name && faces.length ? { name: font.name, faces } : null,
  };
}

export async function readCheckoutTheme(
  graphql: AdminGraphqlClient,
): Promise<Theme | null> {
  try {
    const response = await graphql(CHECKOUT_QUERY);
    const { data } = (await response.json()) as {
      data: {
        checkoutAndAccountsConfigurations: {
          nodes: { isPublished: boolean; branding: Branding | null }[];
        };
      };
    };
    const published = data.checkoutAndAccountsConfigurations.nodes.find(
      (node) => node.isPublished,
    );

    return brandingToTheme(published?.branding ?? null);
  } catch {
    return null;
  }
}

export async function saveTheme(graphql: AdminGraphqlClient, theme: Theme) {
  const installation = await graphql(INSTALLATION_QUERY);
  const {
    data: {
      currentAppInstallation: { id: ownerId },
    },
  } = (await installation.json()) as {
    data: { currentAppInstallation: { id: string } };
  };

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
            fontFace: fontFaces(theme),
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
