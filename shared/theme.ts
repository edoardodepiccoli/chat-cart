import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const themeSchema = z.object({
  primary: hex,
  onPrimary: hex,
  radius: z.coerce.number().int().min(0).max(24),
});

export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  primary: "#1a1a1a",
  onPrimary: "#ffffff",
  radius: 12,
};

export function themeVars(theme: Theme): Record<string, string> {
  return {
    "--cc-color-primary": theme.primary,
    "--cc-color-on-primary": theme.onPrimary,
    "--cc-radius": `${theme.radius}px`,
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
