import type { Message, Prisma } from "@prisma/client";

import type { ChatMessage } from "../../shared/chat";
import type { ChatEvent } from "../../shared/events";
import prisma from "../db.server";

function toChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    role: message.role as ChatMessage["role"],
    parts: message.parts as ChatMessage["parts"],
  };
}

function findConversation(shop: string, id: string) {
  return prisma.conversation.findFirst({
    where: { id, shop },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function openConversation(
  shop: string,
  id: string | null,
): Promise<{ id: string; messages: ChatMessage[] }> {
  const conversation =
    (id && (await findConversation(shop, id))) ||
    (await prisma.conversation.create({
      data: { shop },
      include: { messages: true },
    }));

  return {
    id: conversation.id,
    messages: conversation.messages.map(toChatMessage),
  };
}

export async function loadMessages(
  shop: string,
  id: string,
): Promise<ChatMessage[] | null> {
  const conversation = await findConversation(shop, id);
  return conversation && conversation.messages.map(toChatMessage);
}

export async function saveMessage(conversationId: string, message: ChatMessage) {
  await prisma.message.create({
    data: {
      id: message.id,
      conversationId,
      role: message.role,
      parts: message.parts as Prisma.InputJsonValue,
    },
  });
}

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
