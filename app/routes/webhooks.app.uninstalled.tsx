import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { log } from "../log/logger.server";
import { withRequestLog } from "../log/request.server";

export const action = withRequestLog(
  "webhook",
  async ({ request }: ActionFunctionArgs) => {
    const { shop, session, topic } = await authenticate.webhook(request);

    log.info("webhook", topic, { shop }, { depth: 1 });

    if (session) {
      await db.session.deleteMany({ where: { shop } });
    }

    return new Response();
  },
);
