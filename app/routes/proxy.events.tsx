import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { chatEventSchema } from "../../shared/chat";
import { log } from "../log/logger.server";
import {
  logRejected,
  setConversation,
  withRequestLog,
} from "../log/request.server";
import { saveEvent } from "../metrics.server";
import { authenticate } from "../shopify.server";

const bodySchema = z
  .object({ conversationId: z.string() })
  .and(chatEventSchema);

const value = (data: string | number) =>
  typeof data === "string" && /[\s"=]/.test(data) ? JSON.stringify(data) : data;

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

    const { conversationId, ...event } = body.data;
    setConversation(conversationId);
    const data: Record<string, string | number> =
      "data" in event ? event.data : {};
    log.info(
      "events",
      event.type,
      Object.fromEntries(
        Object.entries(data).map(([key, item]) => [key, value(item)]),
      ),
      { depth: 1 },
    );
    if (!(await saveEvent(session.shop, conversationId, event))) {
      log.warn("events", "⚠ unknown conversation", {}, { depth: 1 });
      throw new Response("Not found", { status: 404 });
    }

    return new Response(null, { status: 204 });
  },
);
