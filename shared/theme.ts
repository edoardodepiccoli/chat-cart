import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

const fontName = z
  .string()
  .trim()
  .max(60)
  .regex(/^[a-z0-9 ]*$/i);

const fontWeight = z.coerce.number().int().min(300).max(700).multipleOf(100);

const textCase = z.enum(["none", "uppercase", "capitalize"]);

const letterSpacing = z.coerce.number().min(-1).max(4).multipleOf(0.5);

function fontStack(name: string) {
  return `"${name}", system-ui, sans-serif`;
}

const colorsSchema = z.object({
  primary: hex,
  onPrimary: hex,
  primaryHover: hex,
  onPrimaryHover: hex,
  secondary: hex,
  onSecondary: hex,
  secondaryHover: hex,
  onSecondaryHover: hex,
  suggestion: hex,
  onSuggestion: hex,
  suggestionHover: hex,
  onSuggestionHover: hex,
  suggestionBorder: hex,
  background: hex,
  surface: hex,
  userBubble: hex,
  onUserBubble: hex,
  text: hex,
  textMuted: hex,
  border: hex,
});

export const themeSchema = colorsSchema.extend({
  radius: z.coerce.number().int().min(0).max(24),
  borderWidth: z.coerce.number().int().min(0).max(2),
  buttonShape: z.enum(["rounded", "pill"]),
  suggestionShape: z.enum(["rounded", "pill"]),
  shadow: z.enum(["none", "soft", "strong"]),
  spacing: z.enum(["compact", "comfortable", "spacious"]),
  bodyFont: fontName,
  headingFont: fontName,
  fontSize: z.coerce.number().int().min(12).max(18),
  bodyWeight: fontWeight,
  headingWeight: fontWeight,
  buttonWeight: fontWeight,
  headingCase: textCase,
  buttonCase: textCase,
  headingLetterSpacing: letterSpacing,
  buttonLetterSpacing: letterSpacing,
});

export type Theme = z.infer<typeof themeSchema>;

export type ThemeColor = keyof z.infer<typeof colorsSchema>;

export function fontUrls(theme: Theme): string[] {
  const families = new Map<string, number[]>();

  function add(family: string, weights: number[]) {
    if (family)
      families.set(family, [...(families.get(family) ?? []), ...weights]);
  }

  add(theme.bodyFont, [theme.bodyWeight, theme.buttonWeight]);
  add(theme.headingFont || theme.bodyFont, [theme.headingWeight]);

  return [...families].map(([family, weights]) => {
    const wght = [...new Set(weights)].sort((a, b) => a - b).join(";");
    const name = family
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      .replace(/ /g, "+");
    return `https://fonts.googleapis.com/css2?family=${name}:wght@${wght}&display=swap`;
  });
}

const SHADOWS: Record<Theme["shadow"], { panel: string; launcher: string }> =
  {
    none: { panel: "none", launcher: "none" },
    soft: {
      panel: "0 8px 32px rgba(0, 0, 0, 0.16)",
      launcher: "0 8px 24px rgba(0, 0, 0, 0.24)",
    },
    strong: {
      panel: "0 12px 48px rgba(0, 0, 0, 0.28)",
      launcher: "0 10px 32px rgba(0, 0, 0, 0.36)",
    },
  };

const SPACING: Record<Theme["spacing"], number> = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.25,
};

export const DEFAULT_THEME: Theme = {
  primary: "#1a1a1a",
  onPrimary: "#ffffff",
  primaryHover: "#3c3c3c",
  onPrimaryHover: "#ffffff",
  secondary: "#ffffff",
  onSecondary: "#1a1a1a",
  secondaryHover: "#f1f1f1",
  onSecondaryHover: "#1a1a1a",
  suggestion: "#ffffff",
  onSuggestion: "#1a1a1a",
  suggestionHover: "#f1f1f1",
  onSuggestionHover: "#1a1a1a",
  suggestionBorder: "#e3e3e3",
  background: "#ffffff",
  surface: "#f1f1f1",
  userBubble: "#1a1a1a",
  onUserBubble: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#616161",
  border: "#e3e3e3",
  radius: 12,
  borderWidth: 1,
  buttonShape: "rounded",
  suggestionShape: "pill",
  shadow: "soft",
  spacing: "comfortable",
  bodyFont: "",
  headingFont: "",
  fontSize: 14,
  bodyWeight: 400,
  headingWeight: 600,
  buttonWeight: 600,
  headingCase: "none",
  buttonCase: "none",
  headingLetterSpacing: 0,
  buttonLetterSpacing: 0,
};

export function themeVars(theme: Theme): Record<string, string> {
  return {
    "--cc-color-primary": theme.primary,
    "--cc-color-on-primary": theme.onPrimary,
    "--cc-color-primary-hover": theme.primaryHover,
    "--cc-color-on-primary-hover": theme.onPrimaryHover,
    "--cc-color-secondary": theme.secondary,
    "--cc-color-on-secondary": theme.onSecondary,
    "--cc-color-secondary-hover": theme.secondaryHover,
    "--cc-color-on-secondary-hover": theme.onSecondaryHover,
    "--cc-color-suggestion": theme.suggestion,
    "--cc-color-on-suggestion": theme.onSuggestion,
    "--cc-color-suggestion-hover": theme.suggestionHover,
    "--cc-color-on-suggestion-hover": theme.onSuggestionHover,
    "--cc-color-suggestion-border": theme.suggestionBorder,
    "--cc-color-bg": theme.background,
    "--cc-color-surface": theme.surface,
    "--cc-color-user-bubble": theme.userBubble,
    "--cc-color-on-user-bubble": theme.onUserBubble,
    "--cc-color-text": theme.text,
    "--cc-color-text-muted": theme.textMuted,
    "--cc-color-border": theme.border,
    "--cc-radius": `${theme.radius}px`,
    "--cc-border-width": `${theme.borderWidth}px`,
    "--cc-radius-button":
      theme.buttonShape === "pill" ? "999px" : `${theme.radius}px`,
    "--cc-radius-suggestion":
      theme.suggestionShape === "pill" ? "999px" : `${theme.radius}px`,
    "--cc-shadow-panel": SHADOWS[theme.shadow].panel,
    "--cc-shadow-launcher": SHADOWS[theme.shadow].launcher,
    "--cc-space": String(SPACING[theme.spacing]),
    "--cc-font-size": `${theme.fontSize}px`,
    "--cc-font-size-sm": `${theme.fontSize - 2}px`,
    "--cc-font-weight": String(theme.bodyWeight),
    "--cc-font-weight-heading": String(theme.headingWeight),
    "--cc-font-weight-button": String(theme.buttonWeight),
    "--cc-heading-case": theme.headingCase,
    "--cc-button-case": theme.buttonCase,
    "--cc-heading-tracking": `${theme.headingLetterSpacing}px`,
    "--cc-button-tracking": `${theme.buttonLetterSpacing}px`,
    ...(theme.bodyFont
      ? { "--cc-font-family": fontStack(theme.bodyFont) }
      : {}),
    ...(theme.headingFont
      ? { "--cc-font-heading": fontStack(theme.headingFont) }
      : {}),
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
