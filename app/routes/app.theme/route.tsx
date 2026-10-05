import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { SaveBar, useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../../shopify.server";
import { getTheme, saveTheme } from "./theme.server";
import {
  DEFAULT_THEME,
  themeSchema,
  type Theme,
  type ThemeColor,
} from "../../../shared/theme";
import Preview from "../../../chat-widget/src/preview/Preview";
import widgetTokens from "../../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../../chat-widget/src/styles.css?url";
import previewStyles from "../../../chat-widget/src/preview/preview.css?url";

const COLOR_GROUPS: {
  heading: string;
  fields: { name: ThemeColor; label: string; details: string }[];
}[] = [
  {
    heading: "Primary",
    fields: [
      {
        name: "primary",
        label: "Primary color",
        details: "Main buttons, the launcher and focus rings",
      },
      {
        name: "onPrimary",
        label: "Text on primary",
        details: "Text and icons on main buttons and the launcher",
      },
    ],
  },
  {
    heading: "Secondary",
    fields: [
      {
        name: "secondary",
        label: "Secondary color",
        details: "Secondary buttons",
      },
      {
        name: "onSecondary",
        label: "Text on secondary",
        details: "Text on secondary buttons",
      },
    ],
  },
  {
    heading: "Suggested replies",
    fields: [
      {
        name: "suggestion",
        label: "Suggestion color",
        details: "Clickable replies under the assistant's answer",
      },
      {
        name: "onSuggestion",
        label: "Text on suggestions",
        details: "Text in suggested replies",
      },
      {
        name: "suggestionBorder",
        label: "Suggestion border",
        details: "Line around suggested replies",
      },
    ],
  },
  {
    heading: "Surfaces",
    fields: [
      {
        name: "background",
        label: "Background",
        details: "Chat panel, cards and the message field",
      },
      {
        name: "surface",
        label: "Surface",
        details: "Assistant messages, typing indicator and image placeholders",
      },
      {
        name: "userBubble",
        label: "Customer messages",
        details: "Messages the shopper sends",
      },
      {
        name: "onUserBubble",
        label: "Text on customer messages",
        details: "Text in messages the shopper sends",
      },
    ],
  },
  {
    heading: "Text and lines",
    fields: [
      { name: "text", label: "Text", details: "Main text" },
      {
        name: "textMuted",
        label: "Muted text",
        details: "Prices, labels and hints",
      },
      {
        name: "border",
        label: "Borders",
        details: "Lines around the panel, cards, fields and buttons",
      },
    ],
  },
];

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

export default function ThemePage() {
  const { theme } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);

  const dirty = (Object.keys(theme) as (keyof Theme)[]).some(
    (key) => draft[key] !== theme[key],
  );

  function load(values: Theme) {
    setDraft(values);
    setFormKey((key) => key + 1);
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Theme saved");
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="Theme">
      <SaveBar id="theme-save-bar" open={dirty}>
        <button
          variant="primary"
          loading={fetcher.state !== "idle" ? "" : undefined}
          onClick={() => fetcher.submit(draft, { method: "post" })}
        ></button>
        <button onClick={() => load(theme)}></button>
      </SaveBar>
      <s-section>
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(min(100%, 400px), 1fr))"
          gap="base"
        >
          <form
            key={formKey}
            onSubmit={(event) => event.preventDefault()}
            onInput={(event) => {
              const parsed = themeSchema.safeParse(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              if (parsed.success) setDraft(parsed.data);
            }}
          >
            <s-stack gap="base">
              <s-stack direction="inline" gap="base">
                <s-button type="button" onClick={() => load(DEFAULT_THEME)}>
                  Revert to default
                </s-button>
              </s-stack>
              {fetcher.data && !fetcher.data.ok && (
                <s-banner tone="critical">
                  Some values are invalid. Check the fields and try again.
                </s-banner>
              )}
              {COLOR_GROUPS.map((group) => (
                <s-stack key={group.heading} gap="small">
                  <s-heading>{group.heading}</s-heading>
                  <s-grid
                    gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
                    gap="base"
                  >
                    {group.fields.map((field) => (
                      <s-color-field
                        key={field.name}
                        label={field.label}
                        name={field.name}
                        value={draft[field.name]}
                        details={field.details}
                        required
                      ></s-color-field>
                    ))}
                  </s-grid>
                </s-stack>
              ))}
            </s-stack>
          </form>

          <div className="cc-preview-frame">
            {mounted && <Preview theme={draft} />}
          </div>
        </s-grid>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
