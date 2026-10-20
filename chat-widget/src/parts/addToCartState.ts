import { t } from "../i18n";

type CartError = { key: string; message: string } | null;

// Only an error for the exact variant being added counts; a stale error for
// another variant says nothing about the current action.
export function errorFor(error: CartError, variantGid: string): string | null {
  return error?.key === variantGid ? error.message : null;
}

export function shouldClosePicker(
  error: CartError,
  variantGid: string,
): boolean {
  return error?.key !== variantGid;
}

export function buttonLabel(state: {
  inCart: boolean;
  multiple: boolean;
  soldOut: boolean;
  pending: boolean;
  values: string;
}): string {
  if (state.inCart) {
    return state.multiple ? `${t("inCart")} · ${state.values}` : t("inCart");
  }
  if (state.soldOut) return t("soldOut");
  if (state.pending) return t("adding");
  return t("addToCart");
}
