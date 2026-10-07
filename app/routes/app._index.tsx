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
import {
  Cell,
  Funnel,
  FunnelChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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

function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted;
}

const FUNNEL_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

const STAGE_HEIGHT = 64;

function WidgetFunnel({ funnel }: { funnel: FunnelCounts }) {
  const mounted = useMounted();

  const counts = [
    { label: "Widget loads", count: funnel.loads },
    { label: "Opened", count: funnel.opened },
    { label: "Engaged", count: funnel.engaged },
    { label: "Added to cart", count: funnel.carted },
    { label: "Checkout", count: funnel.checkout },
  ];
  const steps = counts.map((step, index) => ({
    ...step,
    previous: index > 0 ? counts[index - 1].count : null,
    fill: FUNNEL_COLORS[index],
  }));
  const height = steps.length * STAGE_HEIGHT;

  return (
    <s-grid gridTemplateColumns="minmax(0, 1fr) minmax(170px, 240px)" gap="large">
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const step = payload[0].payload as (typeof steps)[number];
                  const rows = [
                    ["Conversations", int(step.count)],
                    ["Of widget loads", fmtPct(pct(step.count, funnel.loads))],
                    ...(step.previous != null
                      ? [["Of previous step", fmtPct(pct(step.count, step.previous))]]
                      : []),
                  ];
                  return (
                    <s-box
                      padding="small"
                      background="base"
                      border="base"
                      borderRadius="base"
                    >
                      <s-text type="strong">{step.label}</s-text>
                      {rows.map(([label, value]) => (
                        <s-stack
                          key={label}
                          direction="inline"
                          justifyContent="space-between"
                          gap="base"
                        >
                          <s-text color="subdued">{label}</s-text>
                          <s-text type="strong">{value}</s-text>
                        </s-stack>
                      ))}
                    </s-box>
                  );
                }}
              />
              <Funnel
                dataKey="count"
                nameKey="label"
                data={steps}
                lastShapeType="rectangle"
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {steps.map((step) => (
                  <Cell key={step.label} fill={step.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        )}
      </div>
      <div>
        {steps.map((step, index) => (
          <div
            key={step.label}
            style={{
              height: STAGE_HEIGHT,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              borderBottom:
                index < steps.length - 1 ? "1px solid #ebebeb" : undefined,
            }}
          >
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: step.fill,
                }}
              />
              <s-text color="subdued">{step.label}</s-text>
            </s-stack>
            <s-stack direction="inline" gap="small" alignItems="baseline">
              <s-heading>{int(step.count)}</s-heading>
              {step.previous != null && (
                <s-text color="subdued">
                  {fmtPct(pct(step.count, step.previous))} of previous
                </s-text>
              )}
            </s-stack>
          </div>
        ))}
      </div>
    </s-grid>
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
        <s-stack gap="base">
          <s-paragraph>
            {fmtPct(pct(funnel.checkout, funnel.loads))} of widget loads reach
            checkout. Each step counts conversations that got at least that far.
          </s-paragraph>
          <WidgetFunnel funnel={funnel} />
        </s-stack>
      </s-section>
      <ThemeEditor theme={theme} />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
