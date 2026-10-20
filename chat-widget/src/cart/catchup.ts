export { cartsDiffer } from "./store";

export function installCatchup(deps: {
  win: Pick<Window, "addEventListener">;
  doc: Pick<Document, "addEventListener" | "visibilityState">;
  channel: {
    postMessage(m: unknown): void;
    onmessage: ((e: MessageEvent) => void) | null;
  } | null;
  refresh: (withTheme: boolean) => Promise<void>;
}): { announce(): void } {
  const { win, doc, channel, refresh } = deps;

  win.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) void refresh(true);
  });

  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "visible") void refresh(true);
  });

  if (channel) {
    // The payload is deliberately ignored: another tab's cart is re-read, never adopted.
    channel.onmessage = () => {
      void refresh(true);
    };
  }

  return {
    announce() {
      channel?.postMessage("changed");
    },
  };
}
