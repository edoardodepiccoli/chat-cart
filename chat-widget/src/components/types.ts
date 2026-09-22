export type ChatComponent = { type: "textMessage"; props: { text: string } };

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  component: ChatComponent;
};
