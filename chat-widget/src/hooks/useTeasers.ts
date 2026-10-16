import { useEffect, useRef, useState } from "react";

import { fetchTeasers, sendEvent } from "../api";
import { getShopperContext } from "../context";
import type { ChatEvent } from "../../../shared/chat";
import type { PageContext } from "../../../shared/context";

const TEASER_DELAY = 3000;

export function teasersApply(page: PageContext) {
  return (
    page.type === "product" ||
    page.type === "collection" ||
    page.type === "search"
  );
}

export function useTeasers({
  open,
  busy,
  conversationId,
  trackEvent,
  onPick,
}: {
  open: boolean;
  busy: boolean;
  conversationId: string | undefined;
  trackEvent: (event: ChatEvent) => void;
  onPick: (text: string) => void;
}) {
  const [teasers, setTeasers] = useState<string[]>([]);
  const dismissed = useRef(false);
  const shown = useRef(false);

  useEffect(() => {
    if (!conversationId || !teasersApply(getShopperContext().page)) return;
    if (open || busy) {
      setTeasers([]);
      return;
    }
    if (dismissed.current || shown.current) return;
    let cancelled = false;
    Promise.all([
      fetchTeasers(conversationId, { open, busy }),
      new Promise((resolve) => setTimeout(resolve, TEASER_DELAY)),
    ]).then(([items]) => {
      if (cancelled || !items.length) return;
      shown.current = true;
      setTeasers(items);
      sendEvent(conversationId, {
        type: "teaser_shown",
        data: { count: items.length },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, busy, conversationId]);

  function pick(text: string) {
    trackEvent({ type: "teaser_clicked", data: { text } });
    setTeasers([]);
    onPick(text);
  }

  function dismiss() {
    dismissed.current = true;
    trackEvent({ type: "teaser_dismissed" });
    setTeasers([]);
  }

  return { teasers, pick, dismiss };
}
