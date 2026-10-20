import { standardEventsAdapter } from "./standardEvents";
import type { ThemeAdapter } from "./theme";

// Adapters for themes that don't refresh on Shopify's standard cart events,
// keyed by `Shopify.theme.schema_name`. Usually a `sectionAdapter` from
// ./theme that swaps the theme's cart icon and drawer markup.
export const THEME_ADAPTERS: Record<string, ThemeAdapter> = {};

export function pickAdapter(schemaName: string | undefined): ThemeAdapter {
  return (schemaName && THEME_ADAPTERS[schemaName]) || standardEventsAdapter;
}
