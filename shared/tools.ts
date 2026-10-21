import { z } from "zod";

import { highlightSchema, shownProductSchema } from "./product";

export const TOOLS = {
  listProducts: {
    kind: "data",
    label: "lookingUpProducts",
    input: z.object({
      onSale: z.boolean().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      availableOnly: z.boolean().optional(),
      collection: z
        .string()
        .optional()
        .describe("A collection handle from listCollections."),
      productType: z.string().optional(),
      vendor: z.string().optional(),
      option: z
        .object({ name: z.string(), value: z.string() })
        .optional()
        .describe(
          "Only products with this option value in stock, like Size L, with the name and value as listProducts shows them.",
        ),
    }),
  },
  listCollections: {
    kind: "data",
    label: "lookingUpProducts",
    input: z.object({}),
  },
  getProduct: {
    kind: "data",
    label: "lookingUpProducts",
    input: z.object({ handle: z.string() }),
  },
  listStorePages: {
    kind: "data",
    label: "checkingStore",
    input: z.object({}),
  },
  getStorePage: {
    kind: "data",
    label: "checkingStore",
    input: z.object({ handle: z.string() }),
  },
  showProducts: {
    kind: "display",
    label: "typing",
    input: z.object({
      products: z
        .array(
          z.object({
            handle: z.string(),
            highlights: z.array(highlightSchema).length(3),
          }),
        )
        .min(1)
        .max(3),
    }),
    output: z.object({ products: z.array(shownProductSchema) }),
  },
  showFaqCard: {
    kind: "display",
    label: "typing",
    input: z.object({ handle: z.string(), answer: z.string() }),
    output: z.object({
      title: z.string(),
      answer: z.string(),
      url: z.string(),
    }),
  },
} as const satisfies Record<
  string,
  {
    kind: "data" | "display";
    label: "lookingUpProducts" | "checkingStore" | "typing";
    input: z.ZodType;
    output?: z.ZodType;
  }
>;

export type ToolName = keyof typeof TOOLS;

// The types below make the compiler reject a display tool that is missing
// its server output (tools.server.ts) or its widget part (parts/index.tsx).
type ToolOfKind<KIND> = {
  [K in ToolName]: (typeof TOOLS)[K]["kind"] extends KIND ? K : never;
}[ToolName];

export type DataTool = ToolOfKind<"data">;

export type DisplayTool = ToolOfKind<"display">;

const names = Object.keys(TOOLS) as ToolName[];

export const DATA_TOOLS = names.filter(
  (name) => TOOLS[name].kind === "data",
) as DataTool[];

export const DISPLAY_TOOLS = names.filter(
  (name) => TOOLS[name].kind === "display",
) as DisplayTool[];

export type ChatTools = {
  [K in ToolName]: {
    input: z.infer<(typeof TOOLS)[K]["input"]>;
    output: (typeof TOOLS)[K] extends { output: infer O extends z.ZodType }
      ? z.infer<O>
      : unknown;
  };
};
