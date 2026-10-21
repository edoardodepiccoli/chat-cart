import type { Cart } from "../cart";
import { t } from "../i18n";
import { CardIcon } from "../icons";
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
        <span className="cc-checkout__thumb">
          {image && <img className="cc-checkout__image" src={image} alt="" />}
          <span className="cc-checkout__badge">{cart.item_count}</span>
        </span>
        <span className="cc-checkout__label">{t("yourCart")}</span>
      </button>
      <a className="cc-btn" href={CHECKOUT_URL} aria-label={t("checkout")}>
        <CardIcon className="cc-icon" />
        <span className="cc-full">{t("checkout")} ·</span>
        {formatMoney(cart.total_price / 100, cart.currency)}
      </a>
    </div>
  );
}
