import type { ChatEvent } from "../shared/chat";
import prisma from "./db.server";

export async function saveEvent(
  shop: string,
  conversationId: string,
  event: ChatEvent,
): Promise<boolean> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, shop },
    select: { id: true },
  });
  if (!conversation) return false;

  await prisma.event.create({
    data: {
      conversationId,
      type: event.type,
      data: "data" in event ? event.data : undefined,
    },
  });
  return true;
}

export type FunnelCounts = {
  loads: number;
  opened: number;
  engaged: number;
  carted: number;
  checkout: number;
};

export async function getStats(shop: string): Promise<FunnelCounts> {
  const conversations = await prisma.conversation.findMany({
    where: { shop },
    select: {
      messages: { select: { role: true } },
      events: { select: { type: true } },
    },
  });

  const count = (test: (conversation: (typeof conversations)[number]) => boolean) =>
    conversations.filter(test).length;
  const has = (
    conversation: (typeof conversations)[number],
    type: string,
  ) => conversation.events.some((event) => event.type === type);

  return {
    loads: conversations.length,
    opened: count((c) => has(c, "widget_opened")),
    engaged: count((c) => c.messages.some((message) => message.role === "user")),
    carted: count((c) => has(c, "added_to_cart")),
    checkout: count((c) => has(c, "checkout_clicked")),
  };
}
