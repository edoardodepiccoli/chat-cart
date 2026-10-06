import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

import { chatEventSchema } from "../../shared/chat";
import { saveEvent } from "../metrics.server";
import { authenticate } from "../shopify.server";

const bodySchema = z
  .object({ conversationId: z.string() })
  .and(chatEventSchema);

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) throw new Response("Bad request", { status: 400 });

  const { conversationId, ...event } = body.data;
  if (!(await saveEvent(session.shop, conversationId, event))) {
    throw new Response("Not found", { status: 404 });
  }

  return new Response(null, { status: 204 });
};
