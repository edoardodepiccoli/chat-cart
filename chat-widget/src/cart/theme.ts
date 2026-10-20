import type { Sections } from "./ajax";

export type ThemeAdapter = { sections: string[]; apply(html: Sections): void };
export type SectionTarget = { section: string; selector: string };

export function sectionAdapter(
  name: string,
  targets: SectionTarget[],
  after?: () => void,
): ThemeAdapter {
  let warned = false;
  return {
    sections: [...new Set(targets.map((t) => t.section))],
    apply(html) {
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
          `chat-cart: ${name} theme markup not found, see chat-widget/src/cart/ranger.ts`,
        );
      }
    },
  };
}

export const noopAdapter: ThemeAdapter = { sections: [], apply() {} };
