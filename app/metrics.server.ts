import { COMPONENT_ACTIONS } from "../shared/chat";
import type { ChatEvent } from "../shared/events";
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

const DAY = 86_400_000;

type AddedToCart = Extract<ChatEvent, { type: "added_to_cart" }>["data"];

type Summary = {
  createdAt: Date;
  engaged: boolean;
  opened: boolean;
  carted: boolean;
  checkout: boolean;
  cartValue: number;
  checkoutValue: number;
  shown: number;
  actions: number;
};

function stats(summaries: Summary[]) {
  const count = (key: "engaged" | "opened" | "carted" | "checkout") =>
    summaries.filter((summary) => summary[key]).length;
  const sum = (key: "cartValue" | "checkoutValue" | "shown" | "actions") =>
    summaries.reduce((total, summary) => total + summary[key], 0);

  return {
    funnel: {
      loads: summaries.length,
      opened: count("opened"),
      engaged: count("engaged"),
      carted: count("carted"),
      checkout: count("checkout"),
    },
    cartValue: sum("cartValue"),
    checkoutValue: sum("checkoutValue"),
    shown: sum("shown"),
    actions: sum("actions"),
  };
}

export async function getStats(shop: string, days: number) {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  const start = end.getTime() - days * DAY;
  const previousStart = start - days * DAY;

  const conversations = await prisma.conversation.findMany({
    where: { shop, createdAt: { gte: new Date(previousStart), lt: end } },
    select: {
      createdAt: true,
      messages: { select: { role: true, parts: true } },
      events: { select: { type: true, data: true, createdAt: true } },
    },
  });

  let currency: string | null = null;
  const actionTypes = new Set<string>(Object.values(COMPONENT_ACTIONS));

  const summaries: Summary[] = conversations.map((conversation) => {
    let shown = 0;
    for (const message of conversation.messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts as { type: string }[]) {
        if (part.type.replace(/^tool-/, "") in COMPONENT_ACTIONS) shown++;
      }
    }

    const events = conversation.events;
    const has = (type: string) => events.some((event) => event.type === type);
    const adds = events.filter((event) => event.type === "added_to_cart");
    const priceOf = (event: (typeof events)[number]) => {
      const { price } = event.data as AddedToCart;
      currency ??= price.currencyCode;
      return Number(price.amount);
    };
    const lastCheckout = events
      .filter((event) => event.type === "checkout_clicked")
      .reduce<Date | null>(
        (last, event) =>
          last && last > event.createdAt ? last : event.createdAt,
        null,
      );

    return {
      createdAt: conversation.createdAt,
      engaged: conversation.messages.some((message) => message.role === "user"),
      opened: has("widget_opened"),
      carted: adds.length > 0,
      checkout: lastCheckout !== null,
      cartValue: adds.reduce((total, event) => total + priceOf(event), 0),
      checkoutValue: lastCheckout
        ? adds
            .filter((event) => event.createdAt <= lastCheckout)
            .reduce((total, event) => total + priceOf(event), 0)
        : 0,
      shown,
      actions: events.filter((event) => actionTypes.has(event.type)).length,
    };
  });

  const current = summaries.filter(
    (summary) => summary.createdAt.getTime() >= start,
  );
  const previous = summaries.filter(
    (summary) => summary.createdAt.getTime() < start,
  );

  const trend = Array.from({ length: days }, (_, index) => {
    const dayStart = start + index * DAY;
    const inDay = current.filter((summary) => {
      const time = summary.createdAt.getTime();
      return time >= dayStart && time < dayStart + DAY;
    });
    const day = stats(inDay);
    return {
      chats: day.funnel.engaged,
      value: day.cartValue,
      checkoutValue: day.checkoutValue,
    };
  });

  return {
    days,
    currency: currency ?? "USD",
    current: stats(current),
    previous: previous.length ? stats(previous) : null,
    trend,
  };
}
