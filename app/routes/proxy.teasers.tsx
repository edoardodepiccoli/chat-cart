import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { shopperContextSchema } from "../../shared/context";
import {
  buildTeaserInput,
  generateTeasers,
  TEASER_TIMEOUT_MS,
  withDeadline,
} from "../agent/teasers.server";
import { loadMessages } from "../conversations.server";
import { log } from "../log/logger.server";
import {
  logRejected,
  setConversation,
  withRequestLog,
} from "../log/request.server";
import { authenticate } from "../shopify.server";

const bodySchema = z.object({
  conversationId: z.string().max(200).nullable(),
  context: shopperContextSchema,
});

export const action = withRequestLog(
  "teasers",
  async ({ request }: ActionFunctionArgs) => {
    const { session, storefront } = await authenticate.public.appProxy(request);
    if (!session || !storefront) {
      log.warn("teaser", "auth failed");
      throw new Response("Unauthorized", { status: 401 });
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      logRejected("teaser", body.error.issues);
      throw new Response("Bad request", { status: 400 });
    }

    const { conversationId, context } = body.data;
    if (conversationId) setConversation(conversationId);
    if (context.page.type === "other") {
      log.info("teaser", "skipped", { reason: "page-other" }, { depth: 1 });
      return Response.json({ teasers: [] });
    }

    const teasers = await withDeadline(async (signal) => {
      const messages = conversationId
        ? ((await loadMessages(session.shop, conversationId)) ?? [])
        : [];
      const input = await buildTeaserInput(
        storefront,
        context,
        messages,
        signal,
      );
      if (input.context.page.type === "other") {
        if (signal.aborted) return [];
        log.info(
          "teaser",
          "skipped",
          { reason: "resolved-other" },
          { depth: 1 },
        );
        return [];
      }

      return generateTeasers(input, signal);
    }, TEASER_TIMEOUT_MS).catch((error) => {
      log.error(
        "teaser",
        "✗ failed",
        {
          error: `"${error instanceof Error ? error.message : String(error)}"`,
        },
        { depth: 1 },
      );
      return [];
    });

    return Response.json({ teasers });
  },
);
