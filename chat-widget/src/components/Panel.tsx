import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { useCart } from "../cart";
import CartSheet from "./CartSheet";
import CheckoutBar from "./CheckoutBar";
import Composer, { type ComposerProps } from "./Composer";
import Launcher from "./Launcher";

export default function Panel({
  open,
  hideSelector,
  logRef,
  composer,
  onToggle,
  children,
}: {
  open: boolean;
  hideSelector: string;
  logRef: RefObject<HTMLDivElement>;
  composer: ComposerProps;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { cart } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasItems = Boolean(cart?.items.length);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (!hasItems) setSheetOpen(false);
  }, [hasItems]);

  return (
    <>
      <div
        className="cc-backdrop"
        data-open={open}
        onClick={onToggle}
        aria-hidden="true"
      />

      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        aria-hidden={!open}
      >
        <div className="cc-log" ref={logRef}>
          <div className="cc-log__content">{children}</div>
        </div>

        {cart && hasItems && (
          <>
            <CheckoutBar cart={cart} onOpen={() => setSheetOpen(true)} />
            <CartSheet open={sheetOpen} onClose={closeSheet} />
          </>
        )}

        <Composer {...composer} />
      </div>

      <Launcher open={open} hideSelector={hideSelector} onClick={onToggle} />
    </>
  );
}
