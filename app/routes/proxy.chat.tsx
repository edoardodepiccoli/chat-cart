import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { generateId } from "ai";
import { z } from "zod";

import type { ChatMessage } from "../../shared/chat";
import { reply } from "../agent/agent.server";
import { loadMessages, openConversation } from "../conversations.server";
import { authenticate } from "../shopify.server";

const bodySchema = z.object({
  id: z.string().max(200),
  text: z.string().trim().min(1).max(2000),
  country: z.string().max(10),
  language: z.string().max(20),
  productHandle: z.string().max(200),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  const id = new URL(request.url).searchParams.get("id");

  return Response.json(await openConversation(session.shop, id));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, storefront } = await authenticate.public.appProxy(request);
  if (!session || !storefront) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) throw new Response("Bad request", { status: 400 });

  const { id, text, productHandle, ...market } = body.data;

  const history = await loadMessages(session.shop, id);
  if (!history) throw new Response("Not found", { status: 404 });

  const userMessage: ChatMessage = {
    id: generateId(),
    role: "user",
    parts: [{ type: "text", text }],
  };

  return reply(id, history, userMessage, storefront, market, { productHandle });
};
