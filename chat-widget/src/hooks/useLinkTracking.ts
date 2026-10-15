import { ROOT } from "../urls";
import type { ChatEvent } from "../../../shared/chat";

function productHandle(href: string) {
  const path = new URL(href, window.location.href).pathname;
  const prefix = `${ROOT}products/`;
  return path.startsWith(prefix) ? path.slice(prefix.length).split("/")[0] : "";
}

export function useLinkTracking(trackEvent: (event: ChatEvent) => void) {
  return (event: React.MouseEvent) => {
    const link = (event.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (!link || !href) return;
    const handle = productHandle(href);
    trackEvent(
      handle
        ? { type: "product_clicked", data: { handle } }
        : { type: "link_clicked", data: { url: href } },
    );
  };
}
