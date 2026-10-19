import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { generateId } from "ai";
import { z } from "zod";

import type { ChatMessage } from "../../shared/chat";
import { shopperContextSchema } from "../../shared/context";
import { streamReply } from "../agent/agent.server";
import {
  findOrCreateConversation,
  loadMessages,
} from "../conversations.server";
import { log } from "../log/logger.server";
import {
  logRejected,
  setConversation,
  withRequestLog,
} from "../log/request.server";
import { authenticate } from "../shopify.server";

const bodySchema = z.object({
  id: z.string().max(200),
  text: z.string().trim().min(1).max(2000),
  context: shopperContextSchema,
});

const LOADED = {
  found: "found",
  created: "created",
  replaced: "⚠ unknown id, created new",
};

export const loader = withRequestLog(
  "chat",
  async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      log.warn("chat", "auth failed");
      throw new Response("Unauthorized", { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id");

    const { status, ...conversation } = await findOrCreateConversation(
      session.shop,
      id,
    );
    setConversation(conversation.id);
    const message = LOADED[status];
    if (status === "replaced")
      log.warn("db", message, { id: `"${id}"` }, { depth: 1 });
    else
      log.info(
        "db",
        message,
        {},
        {
          depth: 1,
          detail:
            status === "found"
              ? `${conversation.messages.length} messages`
              : undefined,
        },
      );

    return Response.json(conversation);
  },
);

export const action = withRequestLog(
  "chat",
  async ({ request }: ActionFunctionArgs) => {
    const { session, storefront } = await authenticate.public.appProxy(request);
    if (!session || !storefront) {
      log.warn("chat", "auth failed");
      throw new Response("Unauthorized", { status: 401 });
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      logRejected("chat", body.error.issues);
      throw new Response("Bad request", { status: 400 });
    }

    const { id, text, context } = body.data;
    setConversation(id);
    log.info(
      "chat",
      "shopper says",
      {},
      { depth: 1, detail: text, quote: "shopper" },
    );

    const history = await loadMessages(session.shop, id);
    if (!history) {
      log.warn("chat", "⚠ unknown conversation", {}, { depth: 1 });
      throw new Response("Not found", { status: 404 });
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text }],
    };

    return streamReply(id, history, userMessage, storefront, context);
  },
  { endsLater: true },
);
