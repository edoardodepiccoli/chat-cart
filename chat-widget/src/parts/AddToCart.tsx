import { useRef, useState } from "react";

import type { ShownProduct, ShownVariant } from "../../../shared/product";
import { defaultOptions, findVariant, withPick } from "../../../shared/product";
import { addToCart, quantityInCart, useCart } from "../cart";
import { CheckIcon, PlusIcon, SlidersIcon, SpinnerIcon } from "../icons";
import { t } from "../i18n";

type Variants = NonNullable<ShownProduct["variants"]>;

export function buttonLabel(state: {
  inCart: boolean;
  soldOut: boolean;
  pending: boolean;
  multiple: boolean;
}): string {
  if (state.inCart) return t("inCart");
  if (state.soldOut) return t("soldOut");
  if (state.pending) return t("adding");
  return t(state.multiple ? "select" : "addToCart");
}

export function useVariantPicker(variants: Variants) {
  const cart = useCart();
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState(() => defaultOptions(variants));
  // The variant last added from the sheet, which the card then shows.
  const [shown, setShown] = useState<ShownVariant | null>(null);
  // The card's button, which gets focus back when the sheet closes.
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected =
    findVariant(variants, picks) ??
    variants.find((variant) => variant.available) ??
    variants[0];
  const multiple = variants.length > 1;
  const quantity = quantityInCart(cart.cart, selected.id);

  async function add() {
    // The sheet stays open on failure so the shopper can retry.
    if (!(await addToCart(selected.id))) return;
    setPicking(false);
    if (multiple) setShown(selected);
  }

  return {
    variants,
    multiple,
    selected,
    picks,
    picking,
    shown,
    buttonRef,
    pick: (name: string, value: string) =>
      setPicks((current) => withPick(current, name, value)),
    open: () => setPicking(true),
    close: () => setPicking(false),
    add,
    // This variant is being added, for the "Adding…" label.
    pending: cart.pending === selected.id,
    // Any cart write is pending: one write at a time.
    busy: cart.pending !== null,
    quantity,
    inCart: quantity > 0,
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
    multiple: picker.multiple,
  });
  const Icon = picker.inCart
    ? CheckIcon
    : picker.pending
      ? SpinnerIcon
      : picker.soldOut
        ? null
        : picker.multiple
          ? SlidersIcon
          : PlusIcon;

  return (
    <button
      ref={picker.buttonRef}
      type="button"
      className="cc-btn cc-btn--secondary cc-btn--sm cc-pcard__add"
      data-state={
        picker.inCart ? "added" : picker.soldOut ? "sold-out" : undefined
      }
      disabled={
        picker.soldOut || picker.busy || (picker.inCart && !picker.multiple)
      }
      aria-haspopup={picker.multiple ? "dialog" : undefined}
      aria-expanded={picker.multiple ? picker.picking : undefined}
      onClick={picker.multiple ? picker.open : picker.add}
    >
      {Icon && (
        <Icon
          className={`cc-icon cc-icon--pop${picker.pending ? " cc-icon--spin" : ""}`}
          key={picker.inCart ? "in" : picker.pending ? "wait" : "add"}
        />
      )}
      {label}
    </button>
  );
}
