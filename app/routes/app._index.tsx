import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getStats, type FunnelCounts } from "../metrics.server";
import { getTheme, saveTheme } from "../theme.server";
import {
  DEFAULT_THEME,
  themeSchema,
  type Theme,
  type ThemeColor,
} from "../../shared/theme";
import Preview from "../../chat-widget/src/preview/Preview";
import widgetTokens from "../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../chat-widget/src/styles.css?url";
import previewStyles from "../../chat-widget/src/preview/preview.css?url";

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
    ],
  },
  {
    heading: "Secondary",
    fields: [
      {
        name: "secondary",
        label: "Secondary color",
        details: "Secondary buttons",
      },
      {
        name: "onSecondary",
        label: "Text on secondary",
        details: "Text on secondary buttons",
      },
    ],
  },
  {
    heading: "Suggested replies",
    fields: [
      {
        name: "suggestion",
        label: "Suggestion color",
        details: "Clickable replies under the assistant's answer",
      },
      {
        name: "onSuggestion",
        label: "Text on suggestions",
        details: "Text in suggested replies",
      },
      {
        name: "suggestionBorder",
        label: "Suggestion border",
        details: "Line around suggested replies",
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

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  return {
    funnel: await getStats(session.shop),
    theme: await getTheme(admin.graphql),
  };
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


const int = (n: number) => new Intl.NumberFormat("en-US").format(n);

const pct = (part: number, total: number) =>
  total === 0 ? null : (part / total) * 100;

const fmtPct = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(1)}%`;

const FUNNEL_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

const BAR_AREA = 220;
const MIN_BAR = 4;
const LABEL_ROOM = 24;

function WidgetFunnel({ funnel }: { funnel: FunnelCounts }) {
  const counts = [
    { label: "Widget loads", count: funnel.loads },
    { label: "Opened", count: funnel.opened },
    { label: "Engaged", count: funnel.engaged },
    { label: "Added to cart", count: funnel.carted },
    { label: "Checkout", count: funnel.checkout },
  ];
  const heights = counts.map((step) =>
    funnel.loads === 0
      ? MIN_BAR
      : Math.max(MIN_BAR, (step.count / funnel.loads) * BAR_AREA),
  );

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {counts.map((step, index) => (
        <div key={step.label} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", height: BAR_AREA + LABEL_ROOM }}>
            {index > 0 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: heights[index - 1],
                    border: "1px dashed #c9c9c9",
                    borderRadius: 6,
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: heights[index - 1] + 4,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                  }}
                >
                  <s-text color="subdued">
                    {fmtPct(pct(step.count, counts[index - 1].count))}
                  </s-text>
                </div>
              </>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: heights[index],
                background: FUNNEL_COLORS[index],
                borderRadius: "6px 6px 0 0",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <s-heading>{int(step.count)}</s-heading>
            <s-text color="subdued">{step.label}</s-text>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThemeEditor({ theme }: { theme: Theme }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(theme);

  function load(values: Theme) {
    setDraft(values);
    setFormKey((key) => key + 1);
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Theme saved");
  }, [fetcher.data, shopify]);

  return (
    <>
      <SaveBar id="theme-save-bar" open={dirty}>
        <button
          variant="primary"
          loading={fetcher.state !== "idle" ? "" : undefined}
          onClick={() => fetcher.submit(draft, { method: "post" })}
        ></button>
        <button onClick={() => load(theme)}></button>
      </SaveBar>
      <s-section heading="Theme">
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))"
          gap="base"
        >
          <form
            key={formKey}
            onSubmit={(event) => event.preventDefault()}
            onInput={(event) => {
              const parsed = themeSchema.safeParse(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              if (parsed.success) setDraft(parsed.data);
            }}
          >
            <s-stack gap="base">
              <s-stack direction="inline" gap="base">
                <s-button type="button" onClick={() => load(DEFAULT_THEME)}>
                  Revert to default
                </s-button>
              </s-stack>
              {fetcher.data && !fetcher.data.ok && (
                <s-banner tone="critical">
                  Some values are invalid. Check the fields and try again.
                </s-banner>
              )}
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
                        value={draft[field.name]}
                        details={field.details}
                        required
                      ></s-color-field>
                    ))}
                  </s-grid>
                </s-stack>
              ))}
            </s-stack>
          </form>

          <div className="cc-preview-frame">
            {mounted && <Preview theme={draft} />}
          </div>
        </s-grid>
      </s-section>
    </>
  );
}

export default function Index() {
  const { funnel, theme } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Home">
      <s-section heading="Funnel">
        <WidgetFunnel funnel={funnel} />
      </s-section>
      <ThemeEditor theme={theme} />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
