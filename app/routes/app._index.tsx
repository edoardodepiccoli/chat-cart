import { useEffect, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return getStats(session.shop);
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

export default function Index() {
  const { funnel, messages, components, events } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Stats">
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
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
