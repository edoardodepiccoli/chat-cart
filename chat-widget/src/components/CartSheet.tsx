import { useEffect } from "react";

import { changeQuantity, useCart } from "../cart";
import { t } from "../i18n";
import {
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
} from "../icons";
import { CHECKOUT_URL, storeUrl } from "../urls";
import { formatMoney } from "./Price";

export default function CartSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { cart, pending, error } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!cart) return null;

  return (
    <>
      <div
        className="cc-sheet__scrim"
        data-open={open}
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className="cc-sheet"
        data-open={open}
        aria-hidden={!open}
        aria-label={t("yourCart")}
      >
        <button
          className="cc-sheet__handle"
          type="button"
          aria-label={t("closeCart")}
          onClick={onClose}
        />
        <div className="cc-sheet__header">
          <h2 className="cc-sheet__title">{t("yourCart")}</h2>
          <span className="cc-sheet__count">{cart.item_count}</span>
          <button
            className="cc-btn cc-btn--ghost cc-btn--icon cc-sheet__close"
            type="button"
            aria-label={t("closeCart")}
            onClick={onClose}
          >
            <CloseIcon className="cc-icon cc-icon--stroke" />
          </button>
        </div>
        <ul className="cc-sheet__lines">
          {cart.items.map((item) => {
            const options = item.product_has_only_default_variant
              ? ""
              : item.options_with_values.map((o) => o.value).join(" / ");
            return (
              <li className="cc-line" key={item.key}>
                <a
                  href={storeUrl(item.url)}
                  className="cc-line__media"
                  aria-label={item.product_title}
                >
                  {item.image && (
                    <img className="cc-line__image" src={item.image} alt="" />
                  )}
                </a>
                <div className="cc-line__info">
                  <a className="cc-line__title" href={storeUrl(item.url)}>
                    {item.product_title}
                  </a>
                  {options && <div className="cc-line__options">{options}</div>}
                </div>
                <div className="cc-line__price">
                  {formatMoney(item.final_line_price / 100, cart.currency)}
                </div>
                <div className="cc-stepper" data-disabled={pending !== null}>
                  <button
                    className="cc-stepper__step"
                    type="button"
                    aria-label={t("decrease")}
                    disabled={pending !== null}
                    onClick={() =>
                      void changeQuantity(item.key, item.quantity - 1)
                    }
                  >
                    <MinusIcon className="cc-icon" />
                  </button>
                  <span className="cc-stepper__value">{item.quantity}</span>
                  <button
                    className="cc-stepper__step"
                    type="button"
                    aria-label={t("increase")}
                    disabled={pending !== null}
                    onClick={() =>
                      void changeQuantity(item.key, item.quantity + 1)
                    }
                  >
                    <PlusIcon className="cc-icon" />
                  </button>
                </div>
                {error?.key === item.key && (
                  <p className="cc-line__error" role="alert">
                    <AlertIcon className="cc-icon" />
                    {error.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="cc-sheet__footer">
          <div className="cc-sheet__total">
            <span className="cc-sheet__total-label">{t("subtotal")}</span>
            <span className="cc-sheet__total-value">
              {formatMoney(cart.total_price / 100, cart.currency)}
            </span>
          </div>
          <a className="cc-btn cc-sheet__checkout" href={CHECKOUT_URL}>
            {t("checkout")}
            <ArrowRightIcon className="cc-icon" />
          </a>
        </div>
      </section>
    </>
  );
}
