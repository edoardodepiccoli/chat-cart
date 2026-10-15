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
  clickedThrough: number;
  teaserShown: number;
  teaserClicked: number;
};

type FunnelConversation = {
  messages: { role: string }[];
  events: { type: string }[];
};

export function countFunnel(conversations: FunnelConversation[]): FunnelCounts {
  const count = (test: (conversation: FunnelConversation) => boolean) =>
    conversations.filter(test).length;
  const has = (conversation: FunnelConversation, type: string) =>
    conversation.events.some((event) => event.type === type);

  return {
    loads: conversations.length,
    opened: count((c) => has(c, "widget_opened")),
    engaged: count((c) =>
      c.messages.some((message) => message.role === "user"),
    ),
    clickedThrough: count((c) => has(c, "product_clicked")),
    teaserShown: count((c) => has(c, "teaser_shown")),
    teaserClicked: count((c) => has(c, "teaser_clicked")),
  };
}

export async function getFunnelCounts(shop: string): Promise<FunnelCounts> {
  const conversations = await prisma.conversation.findMany({
    where: { shop },
    select: {
      messages: { select: { role: true } },
      events: { select: { type: true } },
    },
  });

  return countFunnel(conversations);
}
