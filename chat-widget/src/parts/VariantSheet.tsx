import { useContext, useRef } from "react";
import { createPortal } from "react-dom";

import type { ShownProduct } from "../../../shared/product";
import {
  findVariant,
  isOptionValueAvailable,
  sameText,
} from "../../../shared/product";
import { PanelHost } from "../components/PanelHost";
import { formatMoney, ProductPrice } from "../components/Price";
import { useDialog } from "../hooks/useDialog";
import { t } from "../i18n";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  SpinnerIcon,
} from "../icons";
import type { VariantPickerState } from "./AddToCart";

// One option whose values cost different amounts reads best as a list with a
// price on each row; anything else is a set of buttons per option.
export function showsAsList(product: ShownProduct): boolean {
  const variants = product.variants ?? [];
  return (
    (product.options ?? []).length === 1 &&
    new Set(variants.map((variant) => Number(variant.price.amount))).size > 1
  );
}

export default function VariantSheet({
  picker,
  product,
}: {
  picker: VariantPickerState;
  product: ShownProduct;
}) {
  const host = useContext(PanelHost);
  const sheetRef = useRef<HTMLElement>(null);
  useDialog(sheetRef, picker.picking, picker.close, picker.buttonRef);

  if (!host) return null;
  const { variants, picks, selected } = picker;
  const options = product.options ?? [];
  const asList = showsAsList(product);
  const image = selected.imageUrl ?? product.image?.url ?? null;
  const price = formatMoney(
    Number(selected.price.amount),
    selected.price.currencyCode,
  );

  return createPortal(
    <>
      <div
        className="cc-sheet__scrim"
        data-open={picker.picking}
        onClick={picker.close}
        aria-hidden="true"
      />
      <section
        ref={sheetRef}
        className="cc-sheet cc-vsheet"
        data-open={picker.picking}
        role="dialog"
        aria-modal="true"
        aria-hidden={!picker.picking}
        aria-label={`${t("chooseVariant")}: ${product.title}`}
      >
        <button
          className="cc-sheet__handle"
          type="button"
          aria-label={t("close")}
          tabIndex={-1}
          onClick={picker.close}
        />
        <div className="cc-vsheet__header">
          <span className="cc-vsheet__thumb">
            {image && <img className="cc-vsheet__image" src={image} alt="" />}
          </span>
          <div className="cc-vsheet__heading">
            <span className="cc-vsheet__title">{product.title}</span>
            <ProductPrice
              price={selected.price}
              compareAtPrice={selected.compareAtPrice}
            />
          </div>
          <button
            className="cc-btn cc-btn--ghost cc-btn--icon cc-vsheet__close"
            type="button"
            aria-label={t("close")}
            onClick={picker.close}
          >
            <CloseIcon className="cc-icon cc-icon--stroke" />
          </button>
        </div>

        <div className="cc-vsheet__body">
          {options.map((option) => {
            const current = picks.find((pick) =>
              sameText(pick.name, option.name),
            )?.value;
            return (
              <fieldset className="cc-vsheet__option" key={option.name}>
                <legend className="cc-vsheet__label">
                  <b>{option.name}</b>
                  {current && ` · ${current}`}
                </legend>
                <div
                  className={asList ? "cc-vsheet__list" : "cc-vsheet__chips"}
                >
                  {option.values.map((value) => {
                    const available = isOptionValueAvailable(
                      variants,
                      picks,
                      option.name,
                      value,
                    );
                    const variant = asList
                      ? findVariant(variants, [{ name: option.name, value }])
                      : undefined;
                    return (
                      <button
                        type="button"
                        className={asList ? "cc-chip cc-chip--row" : "cc-chip"}
                        key={value}
                        aria-pressed={
                          current !== undefined && sameText(current, value)
                        }
                        disabled={!available}
                        onClick={() => picker.pick(option.name, value)}
                      >
                        <span className="cc-chip__text" data-text={value}>
                          {value}
                        </span>
                        {variant && (
                          <span className="cc-chip__meta">
                            {available
                              ? formatMoney(
                                  Number(variant.price.amount),
                                  variant.price.currencyCode,
                                )
                              : t("soldOut")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="cc-vsheet__footer">
          {picker.quantity > 0 && (
            <p className="cc-vsheet__in-cart">
              <CheckIcon className="cc-icon" />
              {t("alreadyInCart", { count: String(picker.quantity) })}
            </p>
          )}
          <button
            type="button"
            className="cc-btn cc-vsheet__confirm"
            disabled={!selected.available || picker.busy}
            onClick={picker.add}
          >
            {picker.pending ? (
              <>
                <SpinnerIcon className="cc-icon cc-icon--spin" />
                {t("adding")}
              </>
            ) : (
              <>
                <PlusIcon className="cc-icon" />
                {t("addToCart")}
                <span className="cc-dot" aria-hidden="true">
                  ·
                </span>
                {price}
              </>
            )}
          </button>
          {picker.error !== null && (
            <p className="cc-vsheet__error" role="alert">
              <AlertIcon className="cc-icon" />
              {picker.error}
            </p>
          )}
        </div>
      </section>
    </>,
    host,
  );
}
