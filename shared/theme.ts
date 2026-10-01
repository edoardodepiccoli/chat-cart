import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const themeSchema = z.object({
  primary: hex,
  onPrimary: hex,
  primaryHover: hex,
  onPrimaryHover: hex,
  secondary: hex,
  onSecondary: hex,
  secondaryHover: hex,
  onSecondaryHover: hex,
  background: hex,
  surface: hex,
  userBubble: hex,
  onUserBubble: hex,
  text: hex,
  textMuted: hex,
  border: hex,
  radius: z.coerce.number().int().min(0).max(24),
});

export type Theme = z.infer<typeof themeSchema>;

export type ThemeColor = Exclude<keyof Theme, "radius">;

export const DEFAULT_THEME: Theme = {
  primary: "#1a1a1a",
  onPrimary: "#ffffff",
  primaryHover: "#3c3c3c",
  onPrimaryHover: "#ffffff",
  secondary: "#ffffff",
  onSecondary: "#1a1a1a",
  secondaryHover: "#f1f1f1",
  onSecondaryHover: "#1a1a1a",
  background: "#ffffff",
  surface: "#f1f1f1",
  userBubble: "#1a1a1a",
  onUserBubble: "#ffffff",
  text: "#1a1a1a",
  textMuted: "#616161",
  border: "#e3e3e3",
  radius: 12,
};

export const THEME_PRESETS: { name: string; theme: Theme }[] = [
  { name: "Minimal", theme: DEFAULT_THEME },
  {
    name: "Ocean",
    theme: {
      ...DEFAULT_THEME,
      primary: "#1d4ed8",
      primaryHover: "#1e40af",
      secondaryHover: "#eef3fb",
      surface: "#eef3fb",
      userBubble: "#1d4ed8",
      border: "#d6e0f0",
      radius: 16,
    },
  },
  {
    name: "Forest",
    theme: {
      ...DEFAULT_THEME,
      primary: "#166534",
      primaryHover: "#14532d",
      secondaryHover: "#eef5ef",
      surface: "#eef5ef",
      userBubble: "#166534",
      border: "#d5e3d7",
      radius: 8,
    },
  },
  {
    name: "Ember",
    theme: {
      ...DEFAULT_THEME,
      primary: "#c2410c",
      primaryHover: "#9a3412",
      secondaryHover: "#fdf1ea",
      surface: "#fdf1ea",
      userBubble: "#c2410c",
      border: "#f0dccf",
      radius: 20,
    },
  },
  {
    name: "Midnight",
    theme: {
      primary: "#e5e5e5",
      onPrimary: "#111111",
      primaryHover: "#ffffff",
      onPrimaryHover: "#111111",
      secondary: "#1f1f1f",
      onSecondary: "#f5f5f5",
      secondaryHover: "#2a2a2a",
      onSecondaryHover: "#ffffff",
      background: "#141414",
      surface: "#1f1f1f",
      userBubble: "#e5e5e5",
      onUserBubble: "#111111",
      text: "#f5f5f5",
      textMuted: "#a3a3a3",
      border: "#2e2e2e",
      radius: 12,
    },
  },
];

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
    "--cc-color-bg": theme.background,
    "--cc-color-surface": theme.surface,
    "--cc-color-user-bubble": theme.userBubble,
    "--cc-color-on-user-bubble": theme.onUserBubble,
    "--cc-color-text": theme.text,
    "--cc-color-text-muted": theme.textMuted,
    "--cc-color-border": theme.border,
    "--cc-radius": `${theme.radius}px`,
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
