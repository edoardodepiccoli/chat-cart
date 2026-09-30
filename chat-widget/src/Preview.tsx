import type { ProductCardProps } from "../../shared/chat";
import ProductCard from "./components/ProductCard";
import Suggestions from "./components/Suggestions";
import { ChatIcon, CloseIcon } from "./icons";

export type PreviewTheme = {
  primary: string;
  onPrimary: string;
  radius: number;
};

function variant(size: string, available: boolean) {
  return {
    id: `gid://shopify/ProductVariant/linen-shirt-${size}`,
    selectedOptions: [{ name: "Size", value: size }],
    price: { amount: "49.00", currencyCode: "EUR" },
    compareAtPrice: { amount: "59.00", currencyCode: "EUR" },
    available,
    imageUrl: null,
  };
}

const PRODUCT: ProductCardProps = {
  handle: "linen-shirt",
  title: "Linen shirt",
  images: [],
  options: [{ name: "Size", values: ["S", "M", "L"] }],
  variants: [variant("S", true), variant("M", true), variant("L", false)],
  selectedOptions: [{ name: "Size", value: "M" }],
};

const SUGGESTIONS = ["Show me more", "What sizes are there?", "Any discounts?"];

function noop() {}

async function noopAsync() {}

export default function Preview({ theme }: { theme: PreviewTheme }) {
  const style = {
    "--cc-color-primary": theme.primary,
    "--cc-color-on-primary": theme.onPrimary,
    "--cc-radius": `${theme.radius}px`,
  } as React.CSSProperties;

  return (
    <div
      id="chat-cart-root"
      className="cc-preview"
      style={style}
      onClickCapture={(event) => {
        if ((event.target as Element).closest("a")) event.preventDefault();
      }}
    >
      <div className="cc-panel" data-open="true" data-size="l">
        <div className="cc-log">
          <div className="cc-log__content">
            <div className="cc-message cc-message--user">
              <div className="cc-part cc-part--text">
                I need a gift for a friend
              </div>
            </div>
            <div className="cc-message cc-message--assistant">
              <div className="cc-part cc-part--text">
                This linen shirt is on sale and makes a great gift.
              </div>
              <div className="cc-part cc-part--tool-showProductCard">
                <ProductCard
                  {...PRODUCT}
                  cartVariantIds={[]}
                  onAdd={noopAsync}
                />
              </div>
            </div>
            <Suggestions
              id="preview"
              items={SUGGESTIONS}
              leaving={false}
              onPick={noop}
              onLeft={noop}
            />
          </div>
        </div>

        <form
          className="cc-composer"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            className="cc-control cc-input"
            placeholder="Type a message"
            aria-label="Message"
          />
          <button className="cc-btn" type="submit">
            Send
          </button>
        </form>
      </div>

      <button
        type="button"
        className="cc-launcher"
        data-open="true"
        aria-label="Close chat"
      >
        <ChatIcon className="cc-launcher__icon cc-launcher__icon--chat" />
        <CloseIcon className="cc-launcher__icon cc-launcher__icon--close" />
      </button>
    </div>
  );
}
