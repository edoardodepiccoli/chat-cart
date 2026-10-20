export type CartItem = {
  key: string;
  variant_id: number;
  product_title: string;
  image: string | null;
  url: string;
  quantity: number;
  final_line_price: number;
  options_with_values: { name: string; value: string }[];
  product_has_only_default_variant: boolean;
};

export type Cart = {
  token: string;
  item_count: number;
  total_price: number;
  currency: string;
  items: CartItem[];
};

export type Sections = Record<string, string | null>;
export type WriteResult = { cart: Cart; sections: Sections };

export class CartError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CartError";
  }
}

export type CartApi = {
  getCart(): Promise<Cart>;
  add(
    variantId: number,
    quantity: number,
    sections: string[],
  ): Promise<WriteResult>;
  change(
    key: string,
    quantity: number,
    sections: string[],
  ): Promise<WriteResult>;
  renderSections(sections: string[]): Promise<Sections>;
};

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export function createCartApi(
  fetchFn: typeof fetch,
  root: string,
  // The current page, so Shopify renders sections in its context.
  pathname: () => string = () =>
    typeof location === "undefined" ? root : location.pathname,
): CartApi {
  async function request<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetchFn(
      url,
      body === undefined
        ? { headers: HEADERS }
        : { method: "POST", headers: HEADERS, body: JSON.stringify(body) },
    );
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      const error = (data ?? {}) as { description?: string; message?: string };
      throw new CartError(
        error.description || error.message || `Cart ${response.status}`,
        response.status,
      );
    }
    return data as T;
  }

  const withSections = (body: object, sections: string[]) =>
    sections.length
      ? { ...body, sections: sections.join(","), sections_url: pathname() }
      : body;

  function getCart() {
    return request<Cart>(`${root}cart.js`);
  }

  return {
    getCart,
    async add(variantId, quantity, sections) {
      const added = await request<{ sections?: Sections }>(
        `${root}cart/add.js`,
        withSections({ items: [{ id: variantId, quantity }] }, sections),
      );
      return { cart: await getCart(), sections: added.sections ?? {} };
    },
    async change(key, quantity, sections) {
      const { sections: rendered, ...cart } = await request<
        Cart & { sections?: Sections }
      >(`${root}cart/change.js`, withSections({ id: key, quantity }, sections));
      return { cart, sections: rendered ?? {} };
    },
    renderSections(sections) {
      return request<Sections>(`${pathname()}?sections=${sections.join(",")}`);
    },
  };
}
