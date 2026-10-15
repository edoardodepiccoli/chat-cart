import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getFunnelCounts } from "../metrics.server";
import Funnel from "../components/Funnel";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return { funnel: await getFunnelCounts(session.shop) };
};

export default function Index() {
  const { funnel } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Home">
      <s-section heading="Funnel">
        <Funnel funnel={funnel} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
