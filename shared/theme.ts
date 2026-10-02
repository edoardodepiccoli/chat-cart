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
  borderWidth: z.coerce.number().int().min(0).max(2),
  buttonShape: z.enum(["rounded", "pill"]),
  shadow: z.enum(["none", "soft", "strong"]),
  fontFamily: z.enum(Object.keys(FONTS) as [FontKey, ...FontKey[]]),
});

export type Theme = z.infer<typeof themeSchema>;

export const themeModeSchema = z.enum(["automatic", "custom"]);

export type ThemeMode = z.infer<typeof themeModeSchema>;

type BrandColor = { background: string; foreground: string };

export type Brand = { primary: BrandColor | null; secondary: BrandColor | null };

export type ThemeColor = Exclude<
  keyof Theme,
  "radius" | "borderWidth" | "buttonShape" | "shadow" | "fontFamily"
>;

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
  borderWidth: 1,
  buttonShape: "rounded",
  shadow: "soft",
  fontFamily: "store",
};

export function themeVars(
  theme: Theme,
  mode: ThemeMode = "custom",
): Record<string, string> {
  const { stack } = font(theme.fontFamily);
  const colors = {
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
  };

  return {
    ...(mode === "custom" ? colors : {}),
    "--cc-radius": `${theme.radius}px`,
    "--cc-border-width": `${theme.borderWidth}px`,
    "--cc-radius-button":
      theme.buttonShape === "pill" ? "999px" : `${theme.radius}px`,
    "--cc-shadow-panel": SHADOWS[theme.shadow].panel,
    "--cc-shadow-launcher": SHADOWS[theme.shadow].launcher,
    ...(stack ? { "--cc-font-family": stack } : {}),
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function brandVars(brand: Brand): Record<string, string> {
  return {
    ...(brand.primary
      ? {
          "--cc-brand-primary": brand.primary.background,
          "--cc-brand-on-primary": brand.primary.foreground,
        }
      : {}),
    ...(brand.secondary
      ? { "--cc-brand-secondary": brand.secondary.background }
      : {}),
  };
}

export function themeStyle(theme: Theme, mode: ThemeMode): string {
  return Object.entries(themeVars(theme, mode))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
