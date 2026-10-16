import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { log } from "../log/logger.server";
import { withRequestLog } from "../log/request.server";

export const action = withRequestLog(
  "webhook",
  async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } =
      await authenticate.webhook(request);
    log.info("webhook", topic, { shop }, { depth: 1 });

    const current = payload.current as string[];
    if (session) {
      await db.session.update({
        where: {
          id: session.id,
        },
        data: {
          scope: current.toString(),
        },
      });
    }
    return new Response();
  },
);
