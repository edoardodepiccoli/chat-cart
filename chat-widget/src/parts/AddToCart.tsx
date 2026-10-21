import { useState } from "react";

import type { SelectedOption, ShownProduct } from "../../../shared/product";
import {
  defaultOptions,
  findVariant,
  isOptionValueAvailable,
  withPick,
} from "../../../shared/product";
import { addToCart, inCart, useCart } from "../cart";
import { formatMoney } from "../components/Price";
import { t } from "../i18n";

type Variants = NonNullable<ShownProduct["variants"]>;

const joinValues = (picks: SelectedOption[]) =>
  picks.map((pick) => pick.value).join(" / ");

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

export function useVariantPicker(variants: Variants) {
  const cart = useCart();
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState(() => defaultOptions(variants));

  const selected =
    findVariant(variants, picks) ??
    variants.find((variant) => variant.available) ??
    variants[0];

  async function add() {
    // The picker stays open on failure so the shopper can retry.
    if (await addToCart(selected.id)) setPicking(false);
  }

  return {
    variants,
    multiple: variants.length > 1,
    selected,
    picks,
    picking,
    pick: (name: string, value: string) =>
      setPicks((current) => withPick(current, name, value)),
    open: () => setPicking(true),
    close: () => setPicking(false),
    add,
    // This variant is being added, for the "Adding…" label.
    pending: cart.pending === selected.id,
    // Any cart write is pending: one write at a time.
    busy: cart.pending !== null,
    inCart: inCart(cart.cart, selected.id),
    soldOut: !variants.some((variant) => variant.available),
    error: cart.error?.key === selected.id ? cart.error.message : null,
  };
}

export type VariantPickerState = ReturnType<typeof useVariantPicker>;

export function AddToCartButton({ picker }: { picker: VariantPickerState }) {
  const label = buttonLabel({
    inCart: picker.inCart,
    multiple: picker.multiple,
    soldOut: picker.soldOut,
    pending: picker.pending,
    values: joinValues(picker.selected.selectedOptions),
  });

  return (
    <>
      <button
        type="button"
        className="cc-btn cc-btn--secondary cc-card__add"
        disabled={
          picker.soldOut || picker.busy || (picker.inCart && !picker.multiple)
        }
        aria-expanded={picker.multiple ? picker.picking : undefined}
        onClick={picker.multiple ? picker.open : picker.add}
      >
        {label}
      </button>
      {picker.error !== null && (
        <p className="cc-card__error" role="alert">
          {picker.error}
        </p>
      )}
    </>
  );
}

export function VariantPicker({
  picker,
  options,
}: {
  picker: VariantPickerState;
  options: NonNullable<ShownProduct["options"]>;
}) {
  if (!picker.multiple || !picker.picking) return null;
  const { variants, picks, selected } = picker;
  return (
    <div className="cc-picker">
      {options.map((option) => (
        <div className="cc-picker__row" key={option.name}>
          {option.values.map((value) => (
            <button
              type="button"
              className="cc-chip"
              key={value}
              aria-pressed={picks.some(
                (pick) => pick.name === option.name && pick.value === value,
              )}
              disabled={
                !isOptionValueAvailable(variants, picks, option.name, value)
              }
              onClick={() => picker.pick(option.name, value)}
            >
              {value}
            </button>
          ))}
        </div>
      ))}
      <div className="cc-picker__actions">
        <button
          type="button"
          className="cc-btn cc-btn--secondary"
          onClick={picker.close}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="cc-btn"
          disabled={!selected.available || picker.busy}
          onClick={picker.add}
        >
          {picker.pending
            ? t("adding")
            : t("addVariant", {
                options: joinValues(selected.selectedOptions),
                price: formatMoney(
                  Number(selected.price.amount),
                  selected.price.currencyCode,
                ),
              })}
        </button>
      </div>
    </div>
  );
}
