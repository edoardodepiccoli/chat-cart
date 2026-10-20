import type { Cart } from "../cart/ajax";
import { t } from "../i18n";
import { CHECKOUT_URL } from "../urls";
import { formatMoney } from "./Price";

export default function CheckoutBar({
  cart,
  onOpen,
}: {
  cart: Cart;
  onOpen: () => void;
}) {
  const image = cart.items[0]?.image;
  return (
    <div className="cc-checkout">
      <button
        className="cc-checkout__open"
        type="button"
        aria-label={t("yourCart")}
        onClick={onOpen}
      >
        {image && <img className="cc-checkout__image" src={image} alt="" />}
        <span className="cc-checkout__count">
          {t("cartCount", { count: String(cart.item_count) })}
        </span>
        <span className="cc-checkout__total">
          {formatMoney(cart.total_price / 100, cart.currency)}
        </span>
      </button>
      <a className="cc-btn" href={CHECKOUT_URL}>
        {t("checkout")}
      </a>
    </div>
  );
}
