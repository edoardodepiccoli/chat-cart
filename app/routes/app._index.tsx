import { useEffect, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Area,
  AreaChart,
  Cell,
  Funnel,
  FunnelChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { authenticate } from "../shopify.server";
import { getStats } from "../metrics.server";

const RANGES = [7, 14, 30];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const days = Number(new URL(request.url).searchParams.get("days"));

  return getStats(session.shop, RANGES.includes(days) ? days : 14);
};

type Stats = Awaited<ReturnType<typeof getStats>>;

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

function Delta({
  now,
  prev,
  kind,
}: {
  now: number | null;
  prev: number | null | undefined;
  kind?: "pts";
}) {
  if (prev == null || now == null) {
    return <s-text color="subdued">no prior period</s-text>;
  }
  const diff =
    kind === "pts" ? now - prev : prev === 0 ? null : ((now - prev) / prev) * 100;
  if (diff == null) return <s-text color="subdued">—</s-text>;
  const text =
    kind === "pts"
      ? `${Math.abs(diff).toFixed(1)} pts`
      : `${Math.abs(diff).toFixed(0)}%`;
  if (Math.abs(diff) < 0.05) return <s-text color="subdued">→ {text}</s-text>;
  return diff > 0 ? (
    <s-text tone="success">↑ {text}</s-text>
  ) : (
    <s-text tone="critical">↓ {text}</s-text>
  );
}

function Spark({
  data,
  dataKey,
}: {
  data: Stats["trend"];
  dataKey: keyof Stats["trend"][number];
}) {
  const mounted = useMounted();

  return (
    <div style={{ height: 36, marginTop: 6 }}>
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
          >
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#2a78d6"
              strokeWidth={1.5}
              fill="#2a78d6"
              fillOpacity={0.08}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  delta,
  note,
  spark,
}: {
  label: string;
  value: string;
  delta: React.ReactNode;
  note: string;
  spark?: React.ReactNode;
}) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-text color="subdued">{label}</s-text>
      <s-stack direction="inline" gap="small" alignItems="baseline">
        <s-heading>{value}</s-heading>
        {delta}
      </s-stack>
      <s-text color="subdued">{note}</s-text>
      {spark}
    </s-box>
  );
}

const FUNNEL_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

const STAGE_HEIGHT = 64;

function WidgetFunnel({ funnel }: { funnel: Stats["current"]["funnel"] }) {
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
  const { days, currency, current, previous, trend } =
    useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const f = current.funnel;
  const pf = previous?.funnel;
  const ctr = pct(current.actions, current.shown);

  return (
    <s-page heading="Stats">
      <s-section>
        <s-stack direction="inline" gap="small-200">
          {RANGES.map((range) => (
            <s-button
              key={range}
              variant={range === days ? "primary" : "secondary"}
              onClick={() =>
                setSearchParams((params) => {
                  params.set("days", String(range));
                  return params;
                })
              }
            >
              Last {range} days
            </s-button>
          ))}
        </s-stack>
      </s-section>

      <s-section>
        <s-grid
          gridTemplateColumns="repeat(auto-fill, minmax(180px, 1fr))"
          gap="base"
        >
          <Tile
            label="Chats"
            value={int(f.engaged)}
            delta={<Delta now={f.engaged} prev={pf?.engaged} />}
            note={`${fmtPct(pct(f.engaged, f.loads))} of widget loads`}
            spark={<Spark data={trend} dataKey="chats" />}
          />
          <Tile
            label="Chat → add to cart"
            value={fmtPct(pct(f.carted, f.engaged))}
            delta={
              <Delta
                now={pct(f.carted, f.engaged)}
                prev={pf && pct(pf.carted, pf.engaged)}
                kind="pts"
              />
            }
            note={`${int(f.carted)} of ${int(f.engaged)} chats`}
          />
          <Tile
            label="Chat → checkout"
            value={fmtPct(pct(f.checkout, f.engaged))}
            delta={
              <Delta
                now={pct(f.checkout, f.engaged)}
                prev={pf && pct(pf.checkout, pf.engaged)}
                kind="pts"
              />
            }
            note={`${int(f.checkout)} of ${int(f.engaged)} chats`}
          />
          <Tile
            label="Chat-assisted cart value"
            value={money(current.cartValue)}
            delta={<Delta now={current.cartValue} prev={previous?.cartValue} />}
            note={
              f.carted
                ? `${money(current.cartValue / f.carted)} per carting chat`
                : "—"
            }
            spark={<Spark data={trend} dataKey="value" />}
          />
          <Tile
            label="Chat-assisted checkout value"
            value={money(current.checkoutValue)}
            delta={
              <Delta
                now={current.checkoutValue}
                prev={previous?.checkoutValue}
              />
            }
            note={
              f.checkout
                ? `${money(current.checkoutValue / f.checkout)} per checkout`
                : "—"
            }
            spark={<Spark data={trend} dataKey="checkoutValue" />}
          />
          <Tile
            label="Component click-through"
            value={fmtPct(ctr)}
            delta={
              <Delta
                now={ctr}
                prev={previous && pct(previous.actions, previous.shown)}
                kind="pts"
              />
            }
            note={`${int(current.actions)} clicks on ${int(current.shown)} components`}
          />
        </s-grid>
      </s-section>

      <s-section heading="Funnel">
        <s-stack gap="base">
          <s-paragraph>
            {fmtPct(pct(f.checkout, f.loads))} of widget loads reach checkout.
            Each step counts conversations that got at least that far.
          </s-paragraph>
          <WidgetFunnel funnel={f} />
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
