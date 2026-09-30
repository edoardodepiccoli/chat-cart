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
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { authenticate } from "../shopify.server";
import { getStats } from "../metrics.server";
import { getTheme, saveTheme, themeSchema } from "../theme.server";
import type { Theme } from "../theme.server";
import Preview from "../../chat-widget/src/Preview";
import widgetTokens from "../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../chat-widget/src/styles.css?url";
import previewStyles from "../../chat-widget/src/preview.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const [stats, theme] = await Promise.all([
    getStats(session.shop),
    getTheme(admin.graphql),
  ]);

  return { ...stats, theme };
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

function rate(part: number, total: number) {
  return total === 0 ? "—" : `${((part / total) * 100).toFixed(1)}%`;
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-text color="subdued">{label}</s-text>
      <s-heading>{value}</s-heading>
      {note && <s-text color="subdued">{note}</s-text>}
    </s-box>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return (
    <s-grid
      gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))"
      gap="base"
    >
      {children}
    </s-grid>
  );
}

const FUNNEL_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

function FunnelChart({
  funnel,
}: {
  funnel: Awaited<ReturnType<typeof getStats>>["funnel"];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const counts = [
    { label: "Widget loads", count: funnel.loads },
    { label: "Opened", count: funnel.opened },
    { label: "Engaged", count: funnel.engaged },
    { label: "Added to cart", count: funnel.addedToCart },
    { label: "Checkout", count: funnel.checkout },
  ];
  const steps = counts.map((step, index) => ({
    ...step,
    previous: index > 0 ? counts[index - 1].count : null,
  }));
  const height = steps.length * 48;

  if (!mounted) return <div style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={steps}
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          axisLine={false}
          tickLine={false}
          tick={({ x, y, payload }) => {
            const step = steps.find((item) => item.label === payload.value);
            return (
              <text x={x} y={y} textAnchor="end" fontSize={13}>
                <tspan
                  x={x}
                  dy={step?.previous == null ? 4 : -3}
                  fill="#303030"
                >
                  {payload.value}
                </tspan>
                {step?.previous != null && (
                  <tspan x={x} dy={16} fill="#616161">
                    {rate(step.count, step.previous)} of previous
                  </tspan>
                )}
              </text>
            );
          }}
        />
        <Tooltip
          cursor={{ fill: "#f1f2f4" }}
          formatter={(value) => [value, "Conversations"]}
        />
        <Bar dataKey="count" barSize={24} radius={[0, 4, 4, 0]}>
          {steps.map((step, index) => (
            <Cell key={step.label} fill={FUNNEL_COLORS[index]} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            fill="#303030"
            fontSize={13}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function fieldValue(event: Event) {
  return (event.currentTarget as HTMLInputElement).value;
}

function WidgetLook({ theme }: { theme: Theme }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);

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
      >
        <s-stack gap="base">
          {fetcher.data?.ok === false && (
            <s-banner tone="critical">
              Some values are invalid. Check the fields and try again.
            </s-banner>
          )}
          <s-grid
            gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
            gap="base"
          >
            <s-color-field
              label="Primary color"
              name="primary"
              value={theme.primary}
              details="Buttons, customer messages and the launcher"
              required
              onInput={(event) =>
                setDraft({ ...draft, primary: fieldValue(event) })
              }
            ></s-color-field>
            <s-color-field
              label="Text on primary"
              name="onPrimary"
              value={theme.onPrimary}
              details="Text and icons on the primary color. Pick one that stays readable"
              required
              onInput={(event) =>
                setDraft({ ...draft, onPrimary: fieldValue(event) })
              }
            ></s-color-field>
            <s-number-field
              label="Corner radius"
              name="radius"
              value={String(theme.radius)}
              details="Roundness of the panel, messages, cards, buttons and fields. 0 is square"
              min={0}
              max={24}
              step={1}
              suffix="px"
              required
              onInput={(event) =>
                setDraft({ ...draft, radius: Number(fieldValue(event)) })
              }
            ></s-number-field>
          </s-grid>
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

export default function Index() {
  const { funnel, messages, components, events, theme } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="ChatCart">
      <s-section heading="Funnel">
        <s-stack gap="base">
          <s-paragraph>
            {rate(funnel.checkout, funnel.loads)} of widget loads reach
            checkout.
          </s-paragraph>
          <FunnelChart funnel={funnel} />
        </s-stack>
      </s-section>

      <s-section heading="Messages">
        <Tiles>
          <Tile label="User messages" value={messages.user} />
          <Tile label="Assistant messages" value={messages.assistant} />
          <Tile
            label="User messages per engaged conversation"
            value={
              funnel.engaged === 0
                ? "—"
                : (messages.user / funnel.engaged).toFixed(1)
            }
          />
        </Tiles>
      </s-section>

      <s-section heading="Components shown">
        <Tiles>
          <Tile label="Product card" value={components.showProductCard} />
          <Tile label="Product cards" value={components.showProductCards} />
          <Tile label="FAQ card" value={components.showFaqCard} />
          <Tile label="Cart" value={components.showCart} />
        </Tiles>
      </s-section>

      <s-section heading="Interactions">
        <Tiles>
          <Tile label="Widget opens" value={events.widgetOpened} />
          <Tile
            label="Suggestion clicks"
            value={events.suggestionClicked}
            note={`${rate(events.suggestionClicked, messages.user)} of user messages`}
          />
          <Tile label="Product likes" value={events.productLiked} />
          <Tile label="Add to cart" value={events.addedToCart} />
          <Tile label="Checkout clicks" value={events.checkoutClicked} />
          <Tile label="Link clicks" value={events.linkClicked} />
        </Tiles>
      </s-section>

      <s-section heading="Widget look">
        <WidgetLook theme={theme} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
