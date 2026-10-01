import {
  FONTS,
  themeVars,
  type Theme,
  type ThemeColor,
} from "../../shared/theme";

const SWATCHES: ThemeColor[] = [
  "background",
  "surface",
  "border",
  "secondary",
  "textMuted",
  "text",
  "userBubble",
  "primary",
];

export default function ThemeCard({
  name,
  theme,
}: {
  name: string;
  theme: Theme;
}) {
  return (
    <div
      className="cc-theme cc-theme-card"
      style={themeVars(theme) as React.CSSProperties}
    >
      <div className="cc-theme-card__font">
        {FONTS[theme.fontFamily].label}
      </div>
      <div className="cc-theme-card__title">{name}</div>
      <div className="cc-theme-card__swatches">
        {[...new Set(SWATCHES.map((color) => theme[color]))].map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </div>
      <div className="cc-theme-card__sample">
        <div>Need a gift? Here are three picks.</div>
        <div className="cc-theme-card__actions">
          <span className="cc-btn">Add to cart</span>
          <span className="cc-btn cc-btn--secondary">View</span>
        </div>
      </div>
    </div>
  );
}
