import { useEffect, useRef, useState } from "react";

import type { Cart } from "../cart";
import { t } from "../i18n";
import { CartIcon, ChevronUpIcon } from "../icons";
import { CHECKOUT_URL } from "../urls";
import { formatMoney } from "./Price";

export function itemCount(count: number): string {
  return t(count === 1 ? "itemCountOne" : "itemCountOther", {
    count: String(count),
  });
}

// True for a moment each time the count goes up, so a new item is noticed.
function useFlashOnGrow(count: number): boolean {
  const [flash, setFlash] = useState(false);
  const previous = useRef(count);
  useEffect(() => {
    const grew = count > previous.current;
    previous.current = count;
    if (!grew) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [count]);
  return flash;
}

export default function CheckoutBar({
  cart,
  onOpen,
}: {
  cart: Cart;
  onOpen: () => void;
}) {
  const count = itemCount(cart.item_count);
  const flash = useFlashOnGrow(cart.item_count);
  return (
    <div className="cc-checkout">
      <div className="cc-checkout__inner" data-flash={flash}>
        <button
          className="cc-checkout__open"
          type="button"
          aria-label={`${t("yourCart")}, ${count}`}
          onClick={onOpen}
        >
          <span className="cc-checkout__thumbs">
            {cart.items.slice(0, 3).map((item) => (
              <span className="cc-checkout__thumb" key={item.key}>
                {item.image && (
                  <img className="cc-checkout__image" src={item.image} alt="" />
                )}
              </span>
            ))}
          </span>
          <span className="cc-checkout__text">
            <span className="cc-checkout__label">{t("yourCart")}</span>
            <span className="cc-checkout__count">{count}</span>
          </span>
          <ChevronUpIcon className="cc-icon cc-checkout__chevron" />
        </button>
        <a className="cc-btn cc-checkout__pay" href={CHECKOUT_URL}>
          <CartIcon className="cc-icon cc-checkout__cart" />
          {/* Phones show the short label, so the cart label keeps its room. */}
          <span className="cc-checkout__pay-long">{t("checkout")}</span>
          <span className="cc-checkout__pay-short">{t("checkoutShort")}</span>
          <span className="cc-dot" aria-hidden="true">
            ·
          </span>
          {formatMoney(cart.total_price / 100, cart.currency)}
        </a>
      </div>
    </div>
  );
}
