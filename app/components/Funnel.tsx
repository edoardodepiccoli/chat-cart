import type { FunnelCounts } from "../metrics.server";

const int = (n: number) => new Intl.NumberFormat("en-US").format(n);

const pct = (part: number, total: number) =>
  total === 0 ? null : (part / total) * 100;

const fmtPct = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(1)}%`;

const FUNNEL_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"];

const BAR_AREA = 220;
const MIN_BAR = 4;
const LABEL_ROOM = 24;

export default function Funnel({ funnel }: { funnel: FunnelCounts }) {
  const counts = [
    { label: "Loads", count: funnel.loads },
    { label: "Opened", count: funnel.opened },
    { label: "Engaged", count: funnel.engaged },
    { label: "Clicked through", count: funnel.clickedThrough },
  ];
  const heights = counts.map((step) =>
    funnel.loads === 0
      ? MIN_BAR
      : Math.max(MIN_BAR, (step.count / funnel.loads) * BAR_AREA),
  );

  return (
    <s-stack gap="large">
      <div style={{ display: "flex", gap: 12 }}>
        {counts.map((step, index) => (
          <div key={step.label} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ position: "relative", height: BAR_AREA + LABEL_ROOM }}
            >
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
      <s-stack direction="inline" gap="large">
        <s-stack>
          <s-heading>{int(funnel.teaserShown)}</s-heading>
          <s-text color="subdued">Teasers shown</s-text>
        </s-stack>
        <s-stack>
          <s-heading>{int(funnel.teaserClicked)}</s-heading>
          <s-text color="subdued">Teasers clicked</s-text>
        </s-stack>
      </s-stack>
    </s-stack>
  );
}
