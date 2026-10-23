// Where to copy from and to: `live` matches elements on the page, `fresh`
// matches elements in the HTML Shopify rendered.
export type SwapTarget = { live: string; fresh: string };

function all(root: ParentNode, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    // An invalid selector, e.g. one a merchant typed in the theme editor.
    return [];
  }
}

// Copies innerHTML from the parsed `fresh` matches to the page's `live`
// matches, paired by index. Returns the targets whose `live` selector
// matched nothing or was invalid.
export function swapFromHtml(
  html: string,
  targets: SwapTarget[],
): SwapTarget[] {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return targets.filter((target) => {
    const live = all(document, target.live);
    const fresh = all(parsed, target.fresh);
    live.forEach((element, index) => {
      if (fresh[index]) element.innerHTML = fresh[index].innerHTML;
    });
    return live.length === 0;
  });
}
