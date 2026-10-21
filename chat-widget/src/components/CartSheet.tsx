import { useEffect } from "react";

import { changeQuantity, useCart } from "../cart";
import { t } from "../i18n";
import { CHECKOUT_URL, localUrl } from "../urls";
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
        <h2 className="cc-sheet__title">{t("yourCart")}</h2>
        <ul className="cc-sheet__lines">
          {cart.items.map((item) => {
            const options = item.product_has_only_default_variant
              ? ""
              : item.options_with_values.map((o) => o.value).join(" / ");
            return (
              <li className="cc-line" key={item.key}>
                <a href={localUrl(item.url)} className="cc-line__media">
                  {item.image && (
                    <img className="cc-line__image" src={item.image} alt="" />
                  )}
                </a>
                <div className="cc-line__info">
                  <a className="cc-line__title" href={localUrl(item.url)}>
                    {item.product_title}
                  </a>
                  {options && <div className="cc-line__options">{options}</div>}
                  <div className="cc-line__price">
                    {formatMoney(item.final_line_price / 100, cart.currency)}
                  </div>
                </div>
                <div className="cc-line__qty">
                  <button
                    className="cc-btn cc-btn--secondary cc-line__step"
                    type="button"
                    aria-label={t("decrease")}
                    disabled={pending !== null}
                    onClick={() =>
                      void changeQuantity(item.key, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="cc-btn cc-btn--secondary cc-line__step"
                    type="button"
                    aria-label={t("increase")}
                    disabled={pending !== null}
                    onClick={() =>
                      void changeQuantity(item.key, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
                {error?.key === item.key && (
                  <p className="cc-line__error" role="alert">
                    {error.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="cc-sheet__footer">
          <div className="cc-sheet__total">
            {formatMoney(cart.total_price / 100, cart.currency)}
          </div>
          <a className="cc-btn" href={CHECKOUT_URL}>
            {t("checkout")}
          </a>
        </div>
      </section>
    </>
  );
}
