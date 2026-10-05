import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const themeSchema = z.object({
  primary: hex,
  onPrimary: hex,
  secondary: hex,
  onSecondary: hex,
  suggestion: hex,
  onSuggestion: hex,
  suggestionBorder: hex,
  background: hex,
  surface: hex,
  userBubble: hex,
  onUserBubble: hex,
  text: hex,
  textMuted: hex,
  border: hex,
});

export type Theme = z.infer<typeof themeSchema>;

export type ThemeColor = keyof Theme;

export const DEFAULT_THEME: Theme = {
  primary: "#1a1a1a",
  onPrimary: "#ffffff",
  secondary: "#ffffff",
  onSecondary: "#1a1a1a",
  suggestion: "#ffffff",
  onSuggestion: "#1a1a1a",
  suggestionBorder: "#e3e3e3",
  background: "#ffffff",
  surface: "#f1f1f1",
  userBubble: "#1a1a1a",
  onUserBubble: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#616161",
  border: "#e3e3e3",
};

export function themeVars(theme: Theme): Record<string, string> {
  return {
    "--cc-color-primary": theme.primary,
    "--cc-color-on-primary": theme.onPrimary,
    "--cc-color-secondary": theme.secondary,
    "--cc-color-on-secondary": theme.onSecondary,
    "--cc-color-suggestion": theme.suggestion,
    "--cc-color-on-suggestion": theme.onSuggestion,
    "--cc-color-suggestion-border": theme.suggestionBorder,
    "--cc-color-bg": theme.background,
    "--cc-color-surface": theme.surface,
    "--cc-color-user-bubble": theme.userBubble,
    "--cc-color-on-user-bubble": theme.onUserBubble,
    "--cc-color-text": theme.text,
    "--cc-color-text-muted": theme.textMuted,
    "--cc-color-border": theme.border,
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
