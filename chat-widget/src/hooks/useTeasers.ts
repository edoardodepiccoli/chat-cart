import { useEffect, useState } from "react";

import { fetchTeaser, sendEvent } from "../api";
import { getShopperContext } from "../context";
import type { ChatEvent } from "../../../shared/chat";

const TEASER_DELAY = 3000;

export function useTeasers({
  open,
  conversationId,
  trackEvent,
  onPick,
}: {
  open: boolean;
  conversationId: string | undefined;
  trackEvent: (event: ChatEvent) => void;
  onPick: (text: string) => void;
}) {
  const [teaser, setTeaser] = useState<string>();

  useEffect(() => {
    if (!conversationId || getShopperContext().page.type !== "product") return;
    if (open) {
      setTeaser(undefined);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchTeaser(),
      new Promise((resolve) => setTimeout(resolve, TEASER_DELAY)),
    ])
      .then(([text]) => {
        if (cancelled || !text) return;
        setTeaser(text);
        sendEvent(conversationId, { type: "teaser_shown" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  function click() {
    if (!teaser) return;
    trackEvent({ type: "teaser_clicked" });
    setTeaser(undefined);
    onPick(teaser);
  }

  function dismiss() {
    trackEvent({ type: "teaser_dismissed" });
    setTeaser(undefined);
  }

  return { teaser, click, dismiss };
}
