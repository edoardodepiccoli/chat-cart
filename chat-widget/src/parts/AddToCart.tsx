import { useState } from "react";

import type { SelectedOption, ShownProduct } from "../../../shared/product";
import {
  defaultOptions,
  findVariant,
  isOptionValueAvailable,
  withPick,
} from "../../../shared/product";
import { cartSnapshot, inCart, useCart } from "../cart";
import { formatMoney } from "../components/Price";
import { t } from "../i18n";
import { buttonLabel, errorFor, shouldClosePicker } from "./addToCartState";

type Variants = NonNullable<ShownProduct["variants"]>;

const joinValues = (picks: SelectedOption[]) =>
  picks.map((pick) => pick.value).join(" / ");

export function useAddFlow(variants: Variants) {
  const cart = useCart();
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState(() => defaultOptions(variants));

  const selected =
    findVariant(variants, picks) ??
    variants.find((variant) => variant.available) ??
    variants[0];

  async function add() {
    const id = selected.id;
    await cart.add(id);
    // The picker stays open on failure so the shopper can retry.
    if (shouldClosePicker(cartSnapshot().error, id)) setPicking(false);
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
    pending: cart.pending === selected.id,
    inCart: inCart(cart.cart, selected.id),
    soldOut: !variants.some((variant) => variant.available),
    error: errorFor(cart.error, selected.id),
  };
}

export type AddFlow = ReturnType<typeof useAddFlow>;

export function AddToCart({ flow }: { flow: AddFlow }) {
  const label = buttonLabel({
    inCart: flow.inCart,
    multiple: flow.multiple,
    soldOut: flow.soldOut,
    pending: flow.pending,
    values: joinValues(flow.selected.selectedOptions),
  });

  return (
    <>
      <button
        type="button"
        className="cc-btn cc-btn--secondary cc-card__add"
        disabled={
          flow.soldOut || flow.pending || (flow.inCart && !flow.multiple)
        }
        aria-expanded={flow.multiple ? flow.picking : undefined}
        onClick={flow.multiple ? flow.open : flow.add}
      >
        {label}
      </button>
      {flow.error !== null && (
        <p className="cc-card__error" role="alert">
          {flow.error}
        </p>
      )}
    </>
  );
}

export function VariantPicker({
  flow,
  options,
}: {
  flow: AddFlow;
  options: NonNullable<ShownProduct["options"]>;
}) {
  if (!flow.multiple || !flow.picking) return null;
  const { variants, picks, selected } = flow;
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
              onClick={() => flow.pick(option.name, value)}
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
          onClick={flow.close}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="cc-btn"
          disabled={!selected.available || flow.pending}
          onClick={flow.add}
        >
          {flow.pending
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
