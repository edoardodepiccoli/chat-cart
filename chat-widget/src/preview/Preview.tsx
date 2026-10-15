import type { ChatMessage } from "../../../shared/chat";
import type { ProductSummary } from "../../../shared/product";
import { themeVars, type Theme } from "../../../shared/theme";
import Message from "../components/Message";
import Panel from "../components/Panel";
import Suggestions from "../components/Suggestions";

const PRODUCT: ProductSummary = {
  handle: "linen-shirt",
  title: "Linen shirt",
  image: null,
  price: { amount: "49.00", currencyCode: "EUR" },
  compareAtPrice: { amount: "59.00", currencyCode: "EUR" },
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
        type: "tool-showProducts",
        toolCallId: "preview",
        state: "output-available",
        input: { handles: [PRODUCT.handle] },
        output: { products: [PRODUCT] },
      },
    ],
  },
];

const SUGGESTIONS = ["Show me more", "What sizes are there?", "Any discounts?"];

function noop() {}

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
      <div className="cc-preview-site" aria-hidden="true">
        <div className="cc-preview-site__bar" />
        <div className="cc-preview-site__grid">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} />
          ))}
        </div>
      </div>
      <Panel
        open
        composer={{
          value: "",
          onChange: noop,
          onSubmit: (event) => event.preventDefault(),
        }}
      >
        {MESSAGES.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <Suggestions items={SUGGESTIONS} onPick={noop} />
      </Panel>
    </div>
  );
}
