import { useEffect, useState } from "react";
import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../../shopify.server";
import { readCheckoutTheme, saveTheme } from "./theme.server";
import { DEFAULT_THEME } from "../../../shared/theme";
import Preview from "../../../chat-widget/src/preview/Preview";
import widgetTokens from "../../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../../chat-widget/src/styles.css?url";
import previewStyles from "../../../chat-widget/src/preview/preview.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const checkout = await readCheckoutTheme(admin.graphql);
  const theme = checkout ?? DEFAULT_THEME;
  await saveTheme(admin.graphql, theme);

  return { theme, synced: checkout !== null };
};

export default function ThemePage() {
  const { theme, synced } = useLoaderData<typeof loader>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <s-page heading="Theme">
      <s-section>
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))"
          gap="base"
        >
          <s-stack gap="base">
            {synced ? (
              <s-paragraph>
                The widget follows your checkout styling: background, button
                and accent colors, body font and corner radius. Change them in
                the checkout editor, then open this page again to update the
                widget.
              </s-paragraph>
            ) : (
              <s-banner tone="warning">
                Couldn&apos;t read your checkout styling, so the widget uses
                the default look. Checkout styling needs Shopify Plus.
              </s-banner>
            )}
            <s-link href="shopify://admin/settings/checkout">
              Open checkout settings
            </s-link>
          </s-stack>

          <div className="cc-preview-frame">
            {mounted && <Preview theme={theme} />}
          </div>
        </s-grid>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
