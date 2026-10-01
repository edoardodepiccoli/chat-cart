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
      buttonShape: "pill",
      fontFamily: "dmSans",
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
      shadow: "none",
      fontFamily: "lora",
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
      buttonShape: "pill",
      shadow: "strong",
      fontFamily: "poppins",
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
      borderWidth: 1,
      buttonShape: "rounded",
      shadow: "strong",
      fontFamily: "inter",
    },
  },
  {
    name: "Editorial",
    theme: {
      ...DEFAULT_THEME,
      primary: "#111111",
      primaryHover: "#333333",
      secondary: "#fbf8f1",
      secondaryHover: "#f2ecdf",
      background: "#fbf8f1",
      surface: "#f2ecdf",
      userBubble: "#111111",
      text: "#111111",
      textMuted: "#6b6250",
      border: "#e4dccb",
      radius: 2,
      shadow: "none",
      fontFamily: "playfairDisplay",
    },
  },
  {
    name: "Bubblegum",
    theme: {
      ...DEFAULT_THEME,
      primary: "#db2777",
      primaryHover: "#be185d",
      secondary: "#fff7fb",
      onSecondary: "#3b0a24",
      secondaryHover: "#ffe4f1",
      onSecondaryHover: "#3b0a24",
      background: "#fff7fb",
      surface: "#ffe4f1",
      userBubble: "#db2777",
      text: "#3b0a24",
      textMuted: "#8a3a63",
      border: "#fbcfe8",
      radius: 24,
      buttonShape: "pill",
      fontFamily: "nunito",
    },
  },
  {
    name: "Terracotta",
    theme: {
      ...DEFAULT_THEME,
      primary: "#9a3b1b",
      primaryHover: "#7c2d12",
      secondary: "#f7f1e8",
      onSecondary: "#2b2118",
      secondaryHover: "#ece2d3",
      onSecondaryHover: "#2b2118",
      background: "#f7f1e8",
      surface: "#ece2d3",
      userBubble: "#9a3b1b",
      text: "#2b2118",
      textMuted: "#6e5f4b",
      border: "#dccfbb",
      radius: 10,
      fontFamily: "libreBaskerville",
    },
  },
  {
    name: "Brutalist",
    theme: {
      ...DEFAULT_THEME,
      primary: "#ffde03",
      onPrimary: "#000000",
      primaryHover: "#000000",
      onPrimaryHover: "#ffde03",
      onSecondary: "#000000",
      secondaryHover: "#000000",
      onSecondaryHover: "#ffffff",
      surface: "#f0f0f0",
      userBubble: "#000000",
      text: "#000000",
      textMuted: "#444444",
      border: "#000000",
      radius: 0,
      borderWidth: 2,
      shadow: "none",
      fontFamily: "system",
    },
  },
  {
    name: "Nocturne",
    theme: {
      primary: "#a78bfa",
      onPrimary: "#1a1033",
      primaryHover: "#c4b5fd",
      onPrimaryHover: "#1a1033",
      secondary: "#221c3d",
      onSecondary: "#ede9fe",
      secondaryHover: "#2e2650",
      onSecondaryHover: "#ffffff",
      background: "#17132b",
      surface: "#221c3d",
      userBubble: "#7c3aed",
      onUserBubble: "#ffffff",
      text: "#ede9fe",
      textMuted: "#a59bc7",
      border: "#342b5c",
      radius: 16,
      borderWidth: 1,
      buttonShape: "rounded",
      shadow: "strong",
      fontFamily: "spaceGrotesk",
    },
  },
  {
    name: "Terminal",
    theme: {
      primary: "#39d353",
      onPrimary: "#04140a",
      primaryHover: "#5be274",
      onPrimaryHover: "#04140a",
      secondary: "#121a14",
      onSecondary: "#d4f5dc",
      secondaryHover: "#1a271d",
      onSecondaryHover: "#ffffff",
      background: "#0b0f0c",
      surface: "#121a14",
      userBubble: "#1f3326",
      onUserBubble: "#d4f5dc",
      text: "#d4f5dc",
      textMuted: "#7fae8a",
      border: "#1f3326",
      radius: 0,
      borderWidth: 1,
      buttonShape: "rounded",
      shadow: "none",
      fontFamily: "mono",
    },
  },
];

export function themeVars(theme: Theme): Record<string, string> {
  const { stack } = font(theme.fontFamily);

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

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
