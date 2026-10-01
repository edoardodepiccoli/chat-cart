import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getTheme, saveTheme } from "../theme.server";
import { themeSchema, type Theme } from "../../shared/theme";
import Preview from "../../chat-widget/src/Preview";
import widgetTokens from "../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../chat-widget/src/styles.css?url";
import previewStyles from "../../chat-widget/src/preview.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return { theme: await getTheme(admin.graphql) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const parsed = themeSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success) return { ok: false };

  await saveTheme(admin.graphql, parsed.data);
  return { ok: true };
};

function fieldValue(event: Event) {
  return (event.currentTarget as HTMLInputElement).value;
}

function WidgetLook({ theme }: { theme: Theme }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Widget look saved");
  }, [fetcher.data, shopify]);

  return (
    <s-grid
      gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))"
      gap="base"
    >
      <form
        data-save-bar
        onSubmit={(event) => {
          event.preventDefault();
          fetcher.submit(event.currentTarget, { method: "post" });
        }}
        onReset={() => setDraft(theme)}
      >
        <s-stack gap="base">
          {fetcher.data?.ok === false && (
            <s-banner tone="critical">
              Some values are invalid. Check the fields and try again.
            </s-banner>
          )}
          <s-grid
            gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
            gap="base"
          >
            <s-color-field
              label="Primary color"
              name="primary"
              value={theme.primary}
              details="Buttons, customer messages and the launcher"
              required
              onInput={(event) =>
                setDraft({ ...draft, primary: fieldValue(event) })
              }
            ></s-color-field>
            <s-color-field
              label="Text on primary"
              name="onPrimary"
              value={theme.onPrimary}
              details="Text and icons on the primary color. Pick one that stays readable"
              required
              onInput={(event) =>
                setDraft({ ...draft, onPrimary: fieldValue(event) })
              }
            ></s-color-field>
            <s-number-field
              label="Corner radius"
              name="radius"
              value={String(theme.radius)}
              details="Roundness of the panel, messages, cards, buttons and fields. 0 is square"
              min={0}
              max={24}
              step={1}
              suffix="px"
              required
              onInput={(event) =>
                setDraft({ ...draft, radius: Number(fieldValue(event)) })
              }
            ></s-number-field>
          </s-grid>
        </s-stack>
      </form>

      <div
        style={{
          position: "relative",
          height: 740,
          overflow: "hidden",
          transform: "translateZ(0)",
          borderRadius: 12,
          background: "#f1f2f4",
        }}
      >
        {mounted && <Preview theme={draft} />}
      </div>
    </s-grid>
  );
}

export default function ThemePage() {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Theme">
      <s-section>
        <WidgetLook theme={theme} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
