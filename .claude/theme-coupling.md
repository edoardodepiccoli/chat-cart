# Theme coupling

The widget is built for one theme: **Ranger** (dev store `ranger-ngiknsha.myshopify.com`). This file lists every place the widget depends on that theme's markup or behaviour. Add an entry whenever a new dependency is introduced; check this list first when the theme changes or the widget misbehaves on the storefront.

Entry format: what the widget assumes, where it lives, why, and what breaks if the theme changes.

---

## Cart drawer: `.theme-drawer__dialog`

- **Assumes:** the cart drawer is `<theme-drawer>` containing `dialog.theme-drawer__dialog`, `position: fixed; right: 0`, 480px wide. There is no `<cart-drawer>` element.
- **Where:** `chat-widget/src/styles.css`, `min-width: 481px` block (`.theme-drawer__dialog` rules).
- **Why:** the chat panel docks to the right edge and pushes the page with `margin-right` on `<html>`. Fixed elements ignore that margin, so the drawer slid in under the panel. While the panel is open the drawer gets `right: 400px`.
- **If it changes:** drawer and chat panel overlap again. Re-find the fixed element with DevTools (right-click the cart heading, Inspect) and update the selector.

## Page push: `margin-right` on `<html>`

- **Assumes:** the theme's layout is fluid and reflows when `<html>` gets `margin-right: 400px`, and the theme does not set its own margin on `<html>`.
- **Where:** `chat-widget/src/styles.css`, `html:has(#chat-cart-root:not(.cc-preview) .cc-panel[data-open="true"])`.
- **Why:** the panel pushes the page instead of covering it.
- **If it changes:** page content hidden behind the panel, or horizontal scroll.
- **Note:** the theme also pushes the page by the drawer width when the cart opens. With the drawer shifted by 400px this adds up correctly (viewport - 400 - 480).

## Panel width: 400px in three places

- `.cc-panel { width: 400px }`, the `html` margin, and the drawer `right` offset in `chat-widget/src/styles.css` must stay equal.
- Candidate for a shared CSS variable the next time one of them changes.

## Other fixed elements: `.menu-drawer`

- The theme's mobile menu drawer is also fixed, but it opens from the left and sits below the panel's breakpoint of interest. It is not shifted. Revisit if the panel overlaps it on desktop.

## Cart and links via Shopify globals

- **Assumes:** `window.Shopify.routes.root` for locale-prefixed URLs (`chat-widget/src/cart.ts`), standard `/cart` and checkout URLs, and product URLs from `productUrl`.
- **If it changes:** links and add-to-cart in the chat point to the wrong place. This is Shopify platform behaviour more than the theme, but the theme controls the locale prefix.

## Not yet checked

- Whether the theme's cart count and drawer refresh after the widget adds to the cart. Add an entry once verified.
