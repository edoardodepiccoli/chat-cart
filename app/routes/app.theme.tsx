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

import { authenticate } from "../shopify.server";
import { getTheme, saveTheme } from "../theme.server";
import {
  FONTS,
  fontUrl,
  THEME_PRESETS,
  themeSchema,
  type FontKey,
  type Theme,
  type ThemeColor,
} from "../../shared/theme";
import Preview from "../../chat-widget/src/Preview";
import ThemeCard from "../../chat-widget/src/ThemeCard";
import widgetTokens from "../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../chat-widget/src/styles.css?url";
import previewStyles from "../../chat-widget/src/preview.css?url";

const allFonts = fontUrl(Object.keys(FONTS) as FontKey[]);

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
  ...(allFonts ? [{ rel: "stylesheet", href: allFonts }] : []),
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return { theme: await getTheme(admin.graphql) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const parsed = themeSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success) return { ok: false };

  await saveTheme(admin.graphql, parsed.data);
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

function readTheme(form: HTMLFormElement) {
  return themeSchema.safeParse(Object.fromEntries(new FormData(form)));
}

function applyPreset(form: HTMLFormElement, theme: Theme) {
  for (const [name, value] of Object.entries(theme)) {
    const field = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
    if (!field) continue;
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function sameTheme(a: Theme, b: Theme) {
  return (Object.keys(a) as (keyof Theme)[]).every((key) => a[key] === b[key]);
}

function WidgetLook({ theme }: { theme: Theme }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);
  const current = THEME_PRESETS.find((preset) =>
    sameTheme(preset.theme, draft),
  );

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
        onReset={() => setDraft(theme)}
        onInput={(event) => {
          const parsed = readTheme(event.currentTarget);
          if (parsed.success) setDraft(parsed.data);
        }}
      >
        <s-stack gap="base">
          {fetcher.data?.ok === false && (
            <s-banner tone="critical">
              Some values are invalid. Check the fields and try again.
            </s-banner>
          )}
          <s-stack gap="small">
            <s-heading>Presets</s-heading>
            <s-paragraph color="subdued">
              Pick one to fill the fields below. You can still change them
              before saving.
            </s-paragraph>
            <s-grid
              gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))"
              gap="base"
            >
              {THEME_PRESETS.map((preset) => {
                const selected = preset === current;
                return (
                  <s-clickable
                    key={preset.name}
                    type="button"
                    padding="small"
                    borderRadius="base"
                    border={selected ? "large strong" : "base"}
                    accessibilityLabel={
                      selected
                        ? `${preset.name}, current look`
                        : `Use the ${preset.name} preset`
                    }
                    onClick={(event) => {
                      const form = event.currentTarget.closest("form");
                      if (form) applyPreset(form, preset.theme);
                    }}
                  >
                    <s-stack gap="small">
                      <ThemeCard theme={preset.theme} />
                      <s-text type={selected ? "strong" : "generic"}>
                        {preset.name}
                      </s-text>
                    </s-stack>
                  </s-clickable>
                );
              })}
            </s-grid>
          </s-stack>
          {COLOR_GROUPS.map((group) => (
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
            </s-stack>
          ))}
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
          position: "relative",
          height: 740,
          overflow: "hidden",
          transform: "translateZ(0)",
          borderRadius: 12,
          background: "#f1f2f4",
        }}
      >
        {mounted && <Preview theme={draft} />}
      </div>
    </s-grid>
  );
}

export default function ThemePage() {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Theme">
      <s-section>
        <WidgetLook theme={theme} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
