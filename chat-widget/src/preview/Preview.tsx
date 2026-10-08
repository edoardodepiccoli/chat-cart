import type { ChatMessage } from "../../../shared/chat";
import type { Product } from "../../../shared/product";
import { themeVars, type Theme } from "../../../shared/theme";
import Message, { type PartContext } from "../components/Message";
import Panel from "../components/Panel";
import Suggestions from "../components/Suggestions";

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

const PRODUCT: Product = {
  handle: "linen-shirt",
  title: "Linen shirt",
  images: [],
  options: [{ name: "Size", values: ["S", "M", "L"] }],
  variants: [variant("S", true), variant("M", true), variant("L", false)],
  selectedOptions: [{ name: "Size", value: "M" }],
};

const MESSAGES: ChatMessage[] = [
  {
    id: "preview-user",
    role: "user",
    parts: [{ type: "text", text: "I need a gift for a friend" }],
  },
  {
    id: "preview-assistant",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "This linen shirt is on sale and makes a great gift.",
      },
      {
        type: "tool-showProductCard",
        toolCallId: "preview",
        state: "output-available",
        input: { handle: PRODUCT.handle, options: PRODUCT.selectedOptions },
        output: PRODUCT,
      },
    ],
  },
];

const SUGGESTIONS = ["Show me more", "What sizes are there?", "Any discounts?"];

function noop() {}

async function noopAsync() {}

const CONTEXT: PartContext = {
  cart: undefined,
  onLike: noop,
  onAdd: noopAsync,
};

export default function Preview({ theme }: { theme: Theme }) {
  return (
    <div
      id="chat-cart-root"
      className="cc-preview"
      style={themeVars(theme) as React.CSSProperties}
      onClickCapture={(event) => {
        if ((event.target as Element).closest("a")) event.preventDefault();
      }}
    >
      <Panel
        open
        size="l"
        composer={{
          value: "",
          onChange: noop,
          onSubmit: (event) => event.preventDefault(),
        }}
      >
        {MESSAGES.map((message) => (
          <Message key={message.id} message={message} context={CONTEXT} />
        ))}
        <Suggestions
          id="preview"
          items={SUGGESTIONS}
          leaving={false}
          onPick={noop}
          onLeft={noop}
        />
      </Panel>
    </div>
  );
}
