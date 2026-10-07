import { useEffect, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return getStats(session.shop);
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

export default function Index() {
  const funnel = useLoaderData<typeof loader>();

  return (
    <s-page heading="Stats">
      <s-section heading="Funnel">
        <s-stack gap="base">
          <s-paragraph>
            {fmtPct(pct(funnel.checkout, funnel.loads))} of widget loads reach
            checkout. Each step counts conversations that got at least that far.
          </s-paragraph>
          <WidgetFunnel funnel={funnel} />
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
