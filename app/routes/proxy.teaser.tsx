import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { generateTeaser } from "../agent/agent.server";
import { getProduct } from "../agent/storefront.server";
import { authenticate } from "../shopify.server";

const querySchema = z.object({
  handle: z.string().min(1).max(200),
  country: z.string().max(10),
  language: z.string().max(20),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, storefront } = await authenticate.public.appProxy(request);
  if (!session || !storefront) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const query = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) throw new Response("Bad request", { status: 400 });

  const { handle, ...market } = query.data;

  const product = await getProduct(storefront, market, handle);
  if (!product) throw new Response("Not found", { status: 404 });

  return Response.json({
    text: await generateTeaser(product, market.language),
  });
};
