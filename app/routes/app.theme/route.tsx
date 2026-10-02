import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import shopify, { authenticate } from "../../shopify.server";
import { getBrand, getTheme, saveTheme } from "./theme.server";
import {
  contrast,
  FONTS,
  fontUrl,
  themeModeSchema,
  themeSchema,
  type Brand,
  type FontKey,
  type Theme,
  type ThemeColor,
  type ThemeMode,
} from "../../../shared/theme";
import Preview from "../../../chat-widget/src/preview/Preview";
import widgetTokens from "../../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../../chat-widget/src/styles.css?url";
import previewStyles from "../../../chat-widget/src/preview/preview.css?url";

const allFonts = fontUrl(Object.keys(FONTS) as FontKey[]);

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
  ...(allFonts ? [{ rel: "stylesheet", href: allFonts }] : []),
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { storefront } = await shopify.unauthenticated.storefront(session.shop);
  const [{ theme, mode }, brand] = await Promise.all([
    getTheme(admin.graphql),
    getBrand(storefront),
  ]);

  return { theme, mode, brand };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const values = Object.fromEntries(await request.formData());
  const parsed = themeSchema.safeParse(values);
  const mode = themeModeSchema.safeParse(values.mode);
  if (!parsed.success || !mode.success) return { ok: false };

  await saveTheme(admin.graphql, parsed.data, mode.data);
  return { ok: true };
};

const COLOR_GROUPS: {
  heading: string;
  fields: { name: ThemeColor; label: string; details: string }[];
}[] = [
  {
    heading: "Primary",
    fields: [
      {
        name: "primary",
        label: "Primary color",
        details: "Main buttons, the launcher and focus rings",
      },
      {
        name: "onPrimary",
        label: "Text on primary",
        details: "Text and icons on main buttons and the launcher",
      },
      {
        name: "primaryHover",
        label: "Primary hover",
        details: "Main buttons under the pointer",
      },
      {
        name: "onPrimaryHover",
        label: "Text on primary hover",
        details: "Text on hovered main buttons",
      },
    ],
  },
  {
    heading: "Secondary",
    fields: [
      {
        name: "secondary",
        label: "Secondary color",
        details: "Product and FAQ links, suggested replies",
      },
      {
        name: "onSecondary",
        label: "Text on secondary",
        details: "Text on secondary buttons and suggested replies",
      },
      {
        name: "secondaryHover",
        label: "Secondary hover",
        details: "Secondary buttons and suggested replies under the pointer",
      },
      {
        name: "onSecondaryHover",
        label: "Text on secondary hover",
        details: "Text on hovered secondary buttons and suggested replies",
      },
    ],
  },
  {
    heading: "Surfaces",
    fields: [
      {
        name: "background",
        label: "Background",
        details: "Chat panel, cards and the message field",
      },
      {
        name: "surface",
        label: "Surface",
        details: "Assistant messages, typing indicator and image placeholders",
      },
      {
        name: "userBubble",
        label: "Customer messages",
        details: "Messages the shopper sends",
      },
      {
        name: "onUserBubble",
        label: "Text on customer messages",
        details: "Text in messages the shopper sends",
      },
    ],
  },
  {
    heading: "Text and lines",
    fields: [
      { name: "text", label: "Text", details: "Main text" },
      {
        name: "textMuted",
        label: "Muted text",
        details: "Prices, labels and hints",
      },
      {
        name: "border",
        label: "Borders",
        details: "Lines around the panel, cards, fields and buttons",
      },
    ],
  },
];

function readForm(form: HTMLFormElement) {
  const values = Object.fromEntries(new FormData(form));
  return {
    theme: themeSchema.safeParse(values),
    mode: themeModeSchema.safeParse(values.mode),
  };
}

const CONTRAST_PAIRS: {
  text: ThemeColor;
  background: ThemeColor;
  label: string;
}[] = [
  { text: "text", background: "background", label: "Text on background" },
  { text: "text", background: "surface", label: "Text on surface" },
  {
    text: "textMuted",
    background: "background",
    label: "Muted text on background",
  },
  { text: "textMuted", background: "surface", label: "Muted text on surface" },
  { text: "onPrimary", background: "primary", label: "Text on primary" },
  {
    text: "onPrimaryHover",
    background: "primaryHover",
    label: "Text on primary hover",
  },
  { text: "onSecondary", background: "secondary", label: "Text on secondary" },
  {
    text: "onSecondaryHover",
    background: "secondaryHover",
    label: "Text on secondary hover",
  },
  {
    text: "onUserBubble",
    background: "userBubble",
    label: "Text on customer messages",
  },
];

function WidgetLook({
  theme,
  mode,
  brand,
}: {
  theme: Theme;
  mode: ThemeMode;
  brand: Brand;
}) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [draft, setDraft] = useState(theme);
  const [draftMode, setDraftMode] = useState(mode);
  const automatic = draftMode === "automatic";
  const [mounted, setMounted] = useState(false);
  const lowContrast = CONTRAST_PAIRS.map((pair) => ({
    ...pair,
    ratio: contrast(draft[pair.text], draft[pair.background]),
  })).filter((pair) => pair.ratio < 4.5);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Widget look saved");
  }, [fetcher.data, shopify]);

  return (
    <s-grid
      gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))"
      gap="base"
    >
      <form
        data-save-bar
        onSubmit={(event) => {
          event.preventDefault();
          fetcher.submit(event.currentTarget, { method: "post" });
        }}
        onReset={() => {
          setDraft(theme);
          setDraftMode(mode);
        }}
        onInput={(event) => {
          const parsed = readForm(event.currentTarget);
          if (parsed.theme.success) setDraft(parsed.theme.data);
          if (parsed.mode.success) setDraftMode(parsed.mode.data);
        }}
      >
        <s-stack gap="base">
          {fetcher.data?.ok === false && (
            <s-banner tone="critical">
              Some values are invalid. Check the fields and try again.
            </s-banner>
          )}
          <s-choice-list label="Colors" name="mode">
            <s-choice value="automatic" defaultSelected={mode === "automatic"}>
              Automatic
              <s-text slot="details">
                Follows your brand colors from Settings &gt; Brand
              </s-text>
            </s-choice>
            <s-choice value="custom" defaultSelected={mode === "custom"}>
              Custom
              <s-text slot="details">Pick every color yourself</s-text>
            </s-choice>
          </s-choice-list>
          {automatic && !brand.primary && (
            <s-banner tone="warning">
              Your store has no brand colors yet, so the widget uses the
              default colors.{" "}
              <s-link href="shopify://admin/settings/brand">
                Add brand colors
              </s-link>
            </s-banner>
          )}
          <s-box display={automatic ? "none" : "auto"}>
            <s-stack gap="base">
              {COLOR_GROUPS.map((group) => {
                const warnings = lowContrast.filter((pair) =>
                  group.fields.some((field) => field.name === pair.text),
                );
                return (
                  <s-stack key={group.heading} gap="small">
                    <s-heading>{group.heading}</s-heading>
                    <s-grid
                      gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
                      gap="base"
                    >
                      {group.fields.map((field) => (
                        <s-color-field
                          key={field.name}
                          label={field.label}
                          name={field.name}
                          value={theme[field.name]}
                          details={field.details}
                          required
                        ></s-color-field>
                      ))}
                    </s-grid>
                    {warnings.length > 0 && (
                      <s-banner tone="warning">
                        <s-paragraph>
                          Below the 4.5:1 contrast recommended for readable text:
                        </s-paragraph>
                        <s-unordered-list>
                          {warnings.map((pair) => (
                            <s-list-item key={pair.label}>
                              {pair.label} ({pair.ratio.toFixed(1)}:1)
                            </s-list-item>
                          ))}
                        </s-unordered-list>
                      </s-banner>
                    )}
                  </s-stack>
                );
              })}
            </s-stack>
          </s-box>
          <s-stack gap="small">
            <s-heading>Font</s-heading>
            <s-grid
              gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
              gap="base"
            >
              <s-select
                label="Font"
                name="fontFamily"
                value={theme.fontFamily}
                details="Store font uses your theme's font. Named fonts load from Google Fonts"
              >
                {Object.entries(FONTS).map(([key, font]) => (
                  <s-option key={key} value={key}>
                    {font.label}
                  </s-option>
                ))}
              </s-select>
            </s-grid>
          </s-stack>
          <s-stack gap="small">
            <s-heading>Shape and depth</s-heading>
            <s-grid
              gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
              gap="base"
            >
              <s-number-field
                label="Corner radius"
                name="radius"
                value={String(theme.radius)}
                details="Roundness of the panel, messages, cards, fields and rounded buttons. 0 is square"
                min={0}
                max={24}
                step={1}
                suffix="px"
                required
              ></s-number-field>
              <s-number-field
                label="Border width"
                name="borderWidth"
                value={String(theme.borderWidth)}
                details="Lines around the panel, cards, fields and buttons. 0 hides them"
                min={0}
                max={2}
                step={1}
                suffix="px"
                required
              ></s-number-field>
              <s-select
                label="Button shape"
                name="buttonShape"
                value={theme.buttonShape}
                details="Suggested replies are always pills"
              >
                <s-option value="rounded">
                  Rounded, follows corner radius
                </s-option>
                <s-option value="pill">Pill</s-option>
              </s-select>
              <s-select
                label="Shadow"
                name="shadow"
                value={theme.shadow}
                details="Depth under the chat panel and the launcher"
              >
                <s-option value="none">None</s-option>
                <s-option value="soft">Soft</s-option>
                <s-option value="strong">Strong</s-option>
              </s-select>
            </s-grid>
          </s-stack>
        </s-stack>
      </form>

      <div
        style={{
          position: "sticky",
          top: 16,
          alignSelf: "start",
          height: "min(740px, calc(100vh - 32px))",
          overflow: "hidden",
          transform: "translateZ(0)",
          borderRadius: 12,
          background: "#f1f2f4",
        }}
      >
        {mounted && (
          <Preview theme={draft} mode={draftMode} brand={brand} />
        )}
      </div>
    </s-grid>
  );
}

export default function ThemePage() {
  const { theme, mode, brand } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Theme">
      <s-section>
        <WidgetLook theme={theme} mode={mode} brand={brand} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
