import { FONTS, themeVars, type Theme } from "../../shared/theme";

export default function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <div
      className="cc-theme cc-theme-card"
      style={themeVars(theme) as React.CSSProperties}
    >
      <div className="cc-message cc-message--assistant">
        <div className="cc-part cc-part--text">Need a gift?</div>
      </div>
      <div className="cc-message cc-message--user">
        <div className="cc-part cc-part--text">Yes, please</div>
      </div>
      <div className="cc-theme-card__actions">
        <span className="cc-btn">Add</span>
        <span className="cc-btn cc-btn--secondary">View</span>
      </div>
      <div className="cc-theme-card__font">{FONTS[theme.fontFamily].label}</div>
    </div>
  );
}
