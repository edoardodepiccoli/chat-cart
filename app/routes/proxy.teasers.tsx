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
import { authenticate } from "../shopify.server";

const bodySchema = z.object({
  conversationId: z.string().max(200).nullable(),
  context: shopperContextSchema,
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, storefront } = await authenticate.public.appProxy(request);
  if (!session || !storefront) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) throw new Response("Bad request", { status: 400 });

  const { conversationId, context } = body.data;
  if (context.page.type === "other") return Response.json({ teasers: [] });

  const teasers = await withDeadline(async (signal) => {
    const messages = conversationId
      ? ((await loadMessages(session.shop, conversationId)) ?? [])
      : [];
    const input = await buildTeaserInput(storefront, context, messages);
    if (input.context.page.type === "other") return [];

    return generateTeasers(input, signal);
  }, TEASER_TIMEOUT_MS).catch(() => []);

  return Response.json({ teasers });
};
