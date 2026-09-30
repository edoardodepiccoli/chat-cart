import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getStats } from "../metrics.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return getStats(session.shop);
};

function rate(part: number, total: number) {
  return total === 0 ? "—" : `${((part / total) * 100).toFixed(1)}%`;
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-text color="subdued">{label}</s-text>
      <s-heading>{value}</s-heading>
      {note && <s-text color="subdued">{note}</s-text>}
    </s-box>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return (
    <s-grid
      gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))"
      gap="base"
    >
      {children}
    </s-grid>
  );
}

export default function Index() {
  const { funnel, messages, components, events } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="ChatCart">
      <s-section heading="Funnel">
        <s-paragraph>
          Conversations reaching each step. Opened is out of loads, engaged out
          of opened, cart and checkout out of engaged.
        </s-paragraph>
        <Tiles>
          <Tile label="Widget loads" value={funnel.loads} />
          <Tile
            label="Opened"
            value={funnel.opened}
            note={rate(funnel.opened, funnel.loads)}
          />
          <Tile
            label="Engaged"
            value={funnel.engaged}
            note={rate(funnel.engaged, funnel.opened)}
          />
          <Tile
            label="Added to cart"
            value={funnel.addedToCart}
            note={rate(funnel.addedToCart, funnel.engaged)}
          />
          <Tile
            label="Checkout"
            value={funnel.checkout}
            note={rate(funnel.checkout, funnel.engaged)}
          />
        </Tiles>
      </s-section>

      <s-section heading="Messages">
        <Tiles>
          <Tile label="User messages" value={messages.user} />
          <Tile label="Assistant messages" value={messages.assistant} />
          <Tile
            label="User messages per engaged conversation"
            value={
              funnel.engaged === 0
                ? "—"
                : (messages.user / funnel.engaged).toFixed(1)
            }
          />
        </Tiles>
      </s-section>

      <s-section heading="Components shown">
        <Tiles>
          <Tile label="Product card" value={components.showProductCard} />
          <Tile label="Product cards" value={components.showProductCards} />
          <Tile label="FAQ card" value={components.showFaqCard} />
          <Tile label="Cart" value={components.showCart} />
        </Tiles>
      </s-section>

      <s-section heading="Interactions">
        <Tiles>
          <Tile label="Widget opens" value={events.widgetOpened} />
          <Tile
            label="Suggestion clicks"
            value={events.suggestionClicked}
            note={`${rate(events.suggestionClicked, messages.user)} of user messages`}
          />
          <Tile label="Product likes" value={events.productLiked} />
          <Tile label="Add to cart" value={events.addedToCart} />
          <Tile label="Checkout clicks" value={events.checkoutClicked} />
          <Tile label="Link clicks" value={events.linkClicked} />
        </Tiles>
      </s-section>

      <s-section>
        <s-paragraph>
          Turn the chat widget on from the theme editor, under App embeds → Chat
          Cart.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
