import { CHECKOUT_URL, type Cart } from "../cart";
import { t } from "../i18n";
import { CartIcon } from "../icons";
import { formatMoney } from "./Price";

export default function CheckoutBar({ cart }: { cart: Cart }) {
  const image = cart.items[0].image;
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="cc-checkout">
      <div className="cc-checkout__clip">
        <div className="cc-checkout__row">
          {image === null ? (
            <div className="cc-checkout__image" aria-hidden="true" />
          ) : (
            <img className="cc-checkout__image" src={image} alt="" />
          )}
          <div className="cc-checkout__summary">
            <span className="cc-cart__options">
              {t("cartCount", { count: String(count) })}
            </span>
            <span className="cc-checkout__total">
              {formatMoney(cart.total_price / 100, cart.currency)}
            </span>
          </div>
          <a className="cc-btn" href={CHECKOUT_URL}>
            <CartIcon className="cc-icon" />
            {t("checkoutButton")}
          </a>
        </div>
      </div>
    </div>
  );
}
