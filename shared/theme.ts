import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

type Font = { label: string; stack?: string; google?: string };

export const FONTS = {
  store: { label: "Store font" },
  system: {
    label: "System sans",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  serif: { label: "Serif", stack: 'Georgia, "Times New Roman", serif' },
  mono: {
    label: "Mono",
    stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  inter: {
    label: "Inter",
    stack: '"Inter", sans-serif',
    google: "Inter:wght@400;600",
  },
  poppins: {
    label: "Poppins",
    stack: '"Poppins", sans-serif',
    google: "Poppins:wght@400;600",
  },
  dmSans: {
    label: "DM Sans",
    stack: '"DM Sans", sans-serif',
    google: "DM+Sans:wght@400;600",
  },
  nunito: {
    label: "Nunito",
    stack: '"Nunito", sans-serif',
    google: "Nunito:wght@400;600",
  },
  spaceGrotesk: {
    label: "Space Grotesk",
    stack: '"Space Grotesk", sans-serif',
    google: "Space+Grotesk:wght@400;600",
  },
  lora: {
    label: "Lora",
    stack: '"Lora", serif',
    google: "Lora:wght@400;600",
  },
  playfairDisplay: {
    label: "Playfair Display",
    stack: '"Playfair Display", serif',
    google: "Playfair+Display:wght@400;600",
  },
  libreBaskerville: {
    label: "Libre Baskerville",
    stack: '"Libre Baskerville", serif',
    google: "Libre+Baskerville:wght@400;700",
  },
} satisfies Record<string, Font>;

export type FontKey = keyof typeof FONTS;

function font(key: FontKey): Font {
  return FONTS[key];
}

export function fontUrl(keys: FontKey[]): string | null {
  const families = keys.flatMap((key) => font(key).google ?? []);
  if (!families.length) return null;
  const query = families.map((family) => `family=${family}`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

const radius = z.coerce.number().int().min(0).max(24);

export const themeSchema = z.object({
  colors: z.object({
    primary: hex,
    onPrimary: hex,
    secondary: hex,
    onSecondary: hex,
    background: hex,
    surface: hex,
    text: hex,
    textMuted: hex,
    border: hex,
  }),
  cornerRadius: z.object({ small: radius, base: radius, large: radius }),
  font: z.enum(Object.keys(FONTS) as [FontKey, ...FontKey[]]),
  borderWidth: z.coerce.number().int().min(0).max(2),
  buttonShape: z.enum(["rounded", "pill"]),
  shadow: z.enum(["none", "soft", "strong"]),
});

export type Theme = z.infer<typeof themeSchema>;

export type ThemeColor = keyof Theme["colors"];

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

export const DEFAULT_THEME: Theme = {
  colors: {
    primary: "#1a1a1a",
    onPrimary: "#ffffff",
    secondary: "#ffffff",
    onSecondary: "#1a1a1a",
    background: "#ffffff",
    surface: "#f1f1f1",
    text: "#1a1a1a",
    textMuted: "#616161",
    border: "#e3e3e3",
  },
  cornerRadius: { small: 8, base: 12, large: 16 },
  font: "store",
  borderWidth: 1,
  buttonShape: "rounded",
  shadow: "soft",
};

export function themeVars(theme: Theme): Record<string, string> {
  const { colors, cornerRadius } = theme;
  const { stack } = font(theme.font);

  return {
    "--cc-color-primary": colors.primary,
    "--cc-color-on-primary": colors.onPrimary,
    "--cc-color-secondary": colors.secondary,
    "--cc-color-on-secondary": colors.onSecondary,
    "--cc-color-bg": colors.background,
    "--cc-color-surface": colors.surface,
    "--cc-color-text": colors.text,
    "--cc-color-text-muted": colors.textMuted,
    "--cc-color-border": colors.border,
    "--cc-radius-small": `${cornerRadius.small}px`,
    "--cc-radius-base": `${cornerRadius.base}px`,
    "--cc-radius-large": `${cornerRadius.large}px`,
    "--cc-border-width": `${theme.borderWidth}px`,
    "--cc-radius-button":
      theme.buttonShape === "pill" ? "999px" : `${cornerRadius.base}px`,
    "--cc-shadow-panel": SHADOWS[theme.shadow].panel,
    "--cc-shadow-launcher": SHADOWS[theme.shadow].launcher,
    ...(stack ? { "--cc-font-family": stack } : {}),
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
