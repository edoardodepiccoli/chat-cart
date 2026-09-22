export type ProductOption = { name: string; values: string[] };

export type ChatComponent =
  | { type: "textMessage"; props: { text: string } }
  | {
      type: "productCard";
      props: {
        title: string;
        price: string;
        imageUrl: string;
        productUrl: string;
        options: ProductOption[];
      };
    };

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  component: ChatComponent;
};
