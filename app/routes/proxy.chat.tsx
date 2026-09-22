import type { ActionFunctionArgs } from "react-router";

import { reply } from "../chat.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const shop = new URL(request.url).searchParams.get("shop");
  const { messages } = await request.json();

  console.log(`[chat] ${shop}`, JSON.stringify(messages, null, 2));

  return Response.json(await reply(messages));
};
