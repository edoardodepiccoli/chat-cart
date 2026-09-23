import type { ActionFunctionArgs } from "react-router";

import { reply } from "../agent/agent.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { storefront } = await authenticate.public.appProxy(request);
  if (!storefront) throw new Response("Unauthorized", { status: 401 });

  const { messages } = await request.json();

  return reply(messages, storefront);
};
