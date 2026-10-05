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
import { generateTheme, getTheme, saveTheme } from "./theme.server";
import { COLOR_GROUPS, CONTRAST_PAIRS, contrast } from "./fields";
import {
  FONTS,
  fontUrl,
  themeSchema,
  type FontKey,
  type Theme,
} from "../../../shared/theme";
import Preview from "../../../chat-widget/src/preview/Preview";
import widgetTokens from "../../../chat-widget/src/tokens.css?url";
import widgetStyles from "../../../chat-widget/src/styles.css?url";
import previewStyles from "../../../chat-widget/src/preview/preview.css?url";

const allFonts = fontUrl(Object.keys(FONTS) as FontKey[]);

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: widgetTokens },
  { rel: "stylesheet", href: widgetStyles },
  { rel: "stylesheet", href: previewStyles },
  ...(allFonts ? [{ rel: "stylesheet", href: allFonts }] : []),
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return { theme: await getTheme(admin.graphql) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("intent") === "generate") {
    try {
      return { generated: await generateTheme(admin.graphql) };
    } catch {
      return { generateError: true };
    }
  }

  const parsed = themeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false };

  await saveTheme(admin.graphql, parsed.data);
  return { ok: true };
};

export default function ThemePage() {
  const { theme } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const generator = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [fields, setFields] = useState(theme);
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState(theme);
  const [mounted, setMounted] = useState(false);
  const lowContrast = CONTRAST_PAIRS.map((pair) => ({
    ...pair,
    ratio: contrast(draft[pair.text], draft[pair.background]),
  })).filter((pair) => pair.ratio < 4.5);

  const dirty = (Object.keys(theme) as (keyof Theme)[]).some(
    (key) => draft[key] !== theme[key],
  );

  function load(values: Theme) {
    setFields(values);
    setDraft(values);
    setFormKey((key) => key + 1);
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok)
      shopify.toast.show("Theme saved");
  }, [fetcher.data, shopify]);

  useEffect(() => {
    const generated =
      generator.data && "generated" in generator.data
        ? generator.data.generated
        : null;
    if (generated) load(generated);
  }, [generator.data]);

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
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-button
                  type="button"
                  loading={generator.state !== "idle"}
                  onClick={() =>
                    generator.submit({ intent: "generate" }, { method: "post" })
                  }
                >
                  Generate from store theme
                </s-button>
              </s-stack>
              {generator.data && "generateError" in generator.data && (
                <s-banner tone="critical">
                  Theme generation failed. Try again.
                </s-banner>
              )}
              {fetcher.data && "ok" in fetcher.data && !fetcher.data.ok && (
                <s-banner tone="critical">
                  Some values are invalid. Check the fields and try again.
                </s-banner>
              )}
              {COLOR_GROUPS.map((group) => {
                const warnings = lowContrast.filter((pair) =>
                  group.fields.some((field) => field.name === pair.text),
                );
                return (
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
                          value={fields[field.name]}
                          details={field.details}
                          required
                        ></s-color-field>
                      ))}
                    </s-grid>
                    {warnings.length > 0 && (
                      <s-banner tone="warning">
                        <s-paragraph>
                          Below the 4.5:1 contrast recommended for readable
                          text:
                        </s-paragraph>
                        <s-unordered-list>
                          {warnings.map((pair) => (
                            <s-list-item key={pair.label}>
                              {pair.label} ({pair.ratio.toFixed(1)}:1)
                            </s-list-item>
                          ))}
                        </s-unordered-list>
                      </s-banner>
                    )}
                  </s-stack>
                );
              })}
              <s-stack gap="small">
                <s-heading>Font</s-heading>
                <s-grid
                  gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
                  gap="base"
                >
                  <s-select
                    label="Font"
                    name="fontFamily"
                    value={fields.fontFamily}
                    details="Store font uses your theme's font. Named fonts load from Google Fonts"
                  >
                    {Object.entries(FONTS).map(([key, font]) => (
                      <s-option key={key} value={key}>
                        {font.label}
                      </s-option>
                    ))}
                  </s-select>
                </s-grid>
              </s-stack>
              <s-stack gap="small">
                <s-heading>Shape and depth</s-heading>
                <s-grid
                  gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
                  gap="base"
                >
                  <s-number-field
                    label="Corner radius"
                    name="radius"
                    value={String(fields.radius)}
                    details="Roundness of the panel, messages, cards, fields and rounded buttons. 0 is square"
                    min={0}
                    max={24}
                    step={1}
                    suffix="px"
                    required
                  ></s-number-field>
                  <s-number-field
                    label="Border width"
                    name="borderWidth"
                    value={String(fields.borderWidth)}
                    details="Lines around the panel, cards, fields and buttons. 0 hides them"
                    min={0}
                    max={2}
                    step={1}
                    suffix="px"
                    required
                  ></s-number-field>
                  <s-select
                    label="Button shape"
                    name="buttonShape"
                    value={fields.buttonShape}
                    details="Suggested replies are always pills"
                  >
                    <s-option value="rounded">
                      Rounded, follows corner radius
                    </s-option>
                    <s-option value="pill">Pill</s-option>
                  </s-select>
                  <s-select
                    label="Shadow"
                    name="shadow"
                    value={fields.shadow}
                    details="Depth under the chat panel and the launcher"
                  >
                    <s-option value="none">None</s-option>
                    <s-option value="soft">Soft</s-option>
                    <s-option value="strong">Strong</s-option>
                  </s-select>
                </s-grid>
              </s-stack>
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
