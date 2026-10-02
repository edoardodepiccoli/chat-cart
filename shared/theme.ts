export type FontFace = { sources: string; weight: number };

export type Theme = {
  colors: {
    background: string;
    text: string;
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
  };
  cornerRadius: { small: number; base: number; large: number };
  font: { name: string; faces: FontFace[] } | null;
};

export const DEFAULT_THEME: Theme = {
  colors: {
    background: "#ffffff",
    text: "#1a1a1a",
    primary: "#1a1a1a",
    onPrimary: "#ffffff",
    secondary: "#ffffff",
    onSecondary: "#1a1a1a",
  },
  cornerRadius: { small: 8, base: 12, large: 16 },
  font: null,
};

function fontName(theme: Theme) {
  return theme.font?.name.replace(/["<>\\]/g, "");
}

export function themeVars(theme: Theme): Record<string, string> {
  const { colors, cornerRadius } = theme;
  const name = fontName(theme);

  return {
    "--cc-color-bg": colors.background,
    "--cc-color-text": colors.text,
    "--cc-color-primary": colors.primary,
    "--cc-color-on-primary": colors.onPrimary,
    "--cc-color-secondary": colors.secondary,
    "--cc-color-on-secondary": colors.onSecondary,
    "--cc-radius-small": `${cornerRadius.small}px`,
    "--cc-radius-base": `${cornerRadius.base}px`,
    "--cc-radius-large": `${cornerRadius.large}px`,
    ...(name ? { "--cc-font-family": `"${name}", sans-serif` } : {}),
  };
}

export function themeStyle(theme: Theme): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

export function fontFaces(theme: Theme): string {
  const name = fontName(theme);
  if (!name || !theme.font) return "";

  return theme.font.faces
    .map(
      (face) =>
        `@font-face { font-family: "${name}"; src: ${face.sources.replace(/[<>]/g, "")}; font-weight: ${face.weight}; font-display: swap; }`,
    )
    .join("\n");
}
