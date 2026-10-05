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
  return Object.fromEntries(
    Object.entries(theme).map(([key, value]) => [
      `--cc-color-${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`,
      value,
    ]),
  );
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
