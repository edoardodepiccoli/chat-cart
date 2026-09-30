import { COMPONENT_TOOLS } from "../shared/chat";
import prisma from "./db.server";

export async function getStats(shop: string) {
  const conversationsWithEvent = (type: string) =>
    prisma.conversation.count({
      where: { shop, events: { some: { type } } },
    });

  const [
    loads,
    opened,
    engaged,
    addedToCart,
    checkout,
    messagesByRole,
    eventsByType,
    assistantMessages,
  ] = await Promise.all([
    prisma.conversation.count({ where: { shop } }),
    conversationsWithEvent("widget_opened"),
    prisma.conversation.count({
      where: { shop, messages: { some: { role: "user" } } },
    }),
    conversationsWithEvent("added_to_cart"),
    conversationsWithEvent("checkout_clicked"),
    prisma.message.groupBy({
      by: ["role"],
      where: { conversation: { shop } },
      _count: true,
    }),
    prisma.event.groupBy({
      by: ["type"],
      where: { conversation: { shop } },
      _count: true,
    }),
    prisma.message.findMany({
      where: { role: "assistant", conversation: { shop } },
      select: { parts: true },
    }),
  ]);

  const messages = (role: string) =>
    messagesByRole.find((row) => row.role === role)?._count ?? 0;
  const events = (type: string) =>
    eventsByType.find((row) => row.type === type)?._count ?? 0;

  const components = Object.fromEntries(
    COMPONENT_TOOLS.map((name) => [name, 0]),
  ) as Record<(typeof COMPONENT_TOOLS)[number], number>;
  for (const message of assistantMessages) {
    for (const part of message.parts as { type: string }[]) {
      const name = part.type.replace(/^tool-/, "");
      if (name in components) components[name as keyof typeof components]++;
    }
  }

  return {
    funnel: { loads, opened, engaged, addedToCart, checkout },
    messages: { user: messages("user"), assistant: messages("assistant") },
    components,
    events: {
      widgetOpened: events("widget_opened"),
      suggestionClicked: events("suggestion_clicked"),
      productLiked: events("product_liked"),
      addedToCart: events("added_to_cart"),
      checkoutClicked: events("checkout_clicked"),
      linkClicked: events("link_clicked"),
    },
  };
}
