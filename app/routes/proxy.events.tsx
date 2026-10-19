import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { chatEventSchema } from "../../shared/chat";
import { log } from "../log/logger.server";
import {
  logRejected,
  setConversation,
  withRequestLog,
} from "../log/request.server";
import { authenticate } from "../shopify.server";

const bodySchema = z
  .object({ conversationId: z.string().nullable() })
  .and(chatEventSchema);

export const action = withRequestLog(
  "events",
  async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      log.warn("events", "auth failed");
      throw new Response("Unauthorized", { status: 401 });
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      logRejected("events", body.error.issues);
      throw new Response("Bad request", { status: 400 });
    }

    const { conversationId, data } = body.data;
    if (conversationId) setConversation(conversationId);
    const { kind, ...rest } = data;
    log.error("client", kind, rest);

    return new Response(null, { status: 204 });
  },
);
