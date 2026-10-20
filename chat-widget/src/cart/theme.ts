import type { Cart, Sections } from "./ajax";

// What the theme gets after each cart change Shopify confirmed: the cart
// about to be published and the section HTML rendered with the write.
export type ThemeUpdate = { cart: Cart; sections: Sections };
export type ThemeAdapter = {
  // Read at call time, so an adapter can ask the page which sections it has.
  sections(): string[];
  apply(update: ThemeUpdate): void;
};
export type SectionTarget = { section: string; selector: string };

export function sectionAdapter(
  name: string,
  targets: SectionTarget[],
  after?: () => void,
): ThemeAdapter {
  let warned = false;
  const ids = [...new Set(targets.map((t) => t.section))];
  return {
    sections: () => ids,
    apply({ sections: html }) {
      let given = false;
      let replaced = 0;
      for (const [section, markup] of Object.entries(html)) {
        if (markup == null) continue;
        given = true;
        const parsed = new DOMParser().parseFromString(markup, "text/html");
        for (const target of targets) {
          if (target.section !== section) continue;
          const live = document.querySelector(target.selector);
          const fresh = parsed.querySelector(target.selector);
          if (!live || !fresh) continue;
          live.innerHTML = fresh.innerHTML;
          replaced++;
        }
      }
      if (replaced > 0) {
        after?.();
      } else if (given && !warned) {
        warned = true;
        console.warn(
          `chat-cart: ${name} theme markup not found, see chat-widget/src/cart/adapters.ts`,
        );
      }
    },
  };
}

export const noopAdapter: ThemeAdapter = { sections: () => [], apply() {} };
