import { useState } from "react";

import type { ShownProduct } from "../../../shared/product";
import {
  defaultOptions,
  findVariant,
  isOptionValueAvailable,
  withPick,
} from "../../../shared/product";
import { addToCart, inCart, useCart } from "../cart";
import { formatMoney } from "../components/Price";
import { CartIcon, CheckIcon, CloseIcon, SpinnerIcon } from "../icons";
import { t } from "../i18n";

type Variants = NonNullable<ShownProduct["variants"]>;

export interface ButtonLabel {
  short: string;
  full: string;
}

export function buttonLabel(state: {
  inCart: boolean;
  soldOut: boolean;
  pending: boolean;
}): ButtonLabel {
  if (state.inCart) return { short: t("inCart"), full: t("inCartFull") };
  if (state.soldOut) return { short: t("soldOut"), full: t("soldOut") };
  if (state.pending) return { short: t("adding"), full: t("adding") };
  return { short: t("addToCart"), full: t("addToCartFull") };
}

// The short text shows in a narrow panel, the full text where there is room.
function Label({ short, full }: ButtonLabel) {
  return (
    <>
      <span className="cc-short">{short}</span>
      <span className="cc-full">{full}</span>
    </>
  );
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
    soldOut: picker.soldOut,
    pending: picker.pending,
  });
  const Icon = picker.inCart
    ? CheckIcon
    : picker.pending
      ? SpinnerIcon
      : picker.soldOut
        ? null
        : CartIcon;

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
        {Icon && (
          <Icon
            className={`cc-icon cc-icon--pop${picker.pending ? " cc-icon--spin" : ""}`}
            key={picker.inCart ? "in" : picker.pending ? "wait" : "add"}
          />
        )}
        <Label {...label} />
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
  if (!picker.multiple) return null;
  const { variants, picks, selected } = picker;
  const price = formatMoney(
    Number(selected.price.amount),
    selected.price.currencyCode,
  );
  return (
    <div className="cc-picker" data-open={picker.picking}>
      <div className="cc-picker__inner">
        {options.map((option) => (
          <div className="cc-picker__group" key={option.name}>
            <span className="cc-picker__name cc-full">{option.name}</span>
            <div className="cc-picker__row">
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
                  onClick={(event) => {
                    picker.pick(option.name, value);
                    event.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "center",
                      behavior: "smooth",
                    });
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="cc-picker__actions">
          <button
            type="button"
            className="cc-btn cc-btn--secondary"
            aria-label={t("cancel")}
            onClick={picker.close}
          >
            <CloseIcon className="cc-icon cc-icon--stroke" />
            <span className="cc-full">{t("cancel")}</span>
          </button>
          <button
            type="button"
            className="cc-btn cc-picker__confirm"
            aria-label={`${t("addToCartFull")} ${price}`}
            disabled={!selected.available || picker.busy}
            onClick={picker.add}
          >
            {picker.pending ? (
              <SpinnerIcon className="cc-icon cc-icon--spin" />
            ) : (
              <CartIcon className="cc-icon" />
            )}
            <span className="cc-full">{t("addToCartFull")} ·</span>
            {price}
          </button>
        </div>
      </div>
    </div>
  );
}
