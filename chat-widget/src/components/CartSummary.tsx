import type { Cart } from "../cart";
import { t } from "../i18n";
import { CartIcon } from "../icons";
import { formatMoney } from "./Price";

export default function CartSummary({ cart }: { cart: Cart | undefined }) {
  if (cart === undefined) return null;

  if (cart.items.length === 0) {
    return (
      <div className="cc-card">
        <div className="cc-card__body">{t("cartEmpty")}</div>
      </div>
    );
  }

  return (
    <div className="cc-card">
      <div className="cc-card__body">
        <div className="cc-cart__items">
          {cart.items.map((item) => (
            <a className="cc-cart__item" key={item.key} href={item.url}>
              {item.image === null ? (
                <div className="cc-cart__image" aria-hidden="true" />
              ) : (
                <img
                  className="cc-cart__image"
                  src={item.image}
                  alt={item.product_title}
                  loading="lazy"
                />
              )}
              <div className="cc-cart__details">
                <span className="cc-cart__title">{item.product_title}</span>
                {!item.product_has_only_default_variant && (
                  <span className="cc-cart__options">
                    {item.options_with_values
                      .map((option) => option.value)
                      .join(" / ")}
                  </span>
                )}
                <span className="cc-card__price">
                  {formatMoney(item.final_line_price / 100, cart.currency)}
                  {item.quantity > 1 && (
                    <span className="cc-cart__options">× {item.quantity}</span>
                  )}
                </span>
              </div>
            </a>
          ))}
        </div>

        <a className="cc-btn cc-cart__checkout" href="/checkout">
          <CartIcon className="cc-icon" />
          {t("checkout", {
            total: formatMoney(cart.total_price / 100, cart.currency),
          })}
        </a>
      </div>
    </div>
  );
}
