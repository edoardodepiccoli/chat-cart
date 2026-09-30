import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import type { ChatMessage } from "../../shared/chat";
import { reply } from "../agent/agent.server";
import {
  loadMessages,
  openConversation,
  saveMessage,
} from "../agent/conversations.server";
import { authenticate } from "../shopify.server";

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

  const { id, message } = (await request.json()) as {
    id: string;
    message: ChatMessage;
  };

  const history = await loadMessages(session.shop, id);
  if (!history) throw new Response("Not found", { status: 404 });

  const userMessage: ChatMessage = {
    id: message.id,
    role: "user",
    parts: message.parts,
  };
  await saveMessage(id, userMessage);

  return reply(id, [...history, userMessage], storefront);
};
