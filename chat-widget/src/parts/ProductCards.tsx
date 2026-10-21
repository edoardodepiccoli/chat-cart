import type { ReactNode } from "react";

import type { Highlight, ShownProduct } from "../../../shared/product";
import { productUrl } from "../urls";
import { ProductPrice } from "../components/Price";
import { AddToCartButton, VariantPicker, useVariantPicker } from "./AddToCart";

function ProductCard({
  handle,
  title,
  image,
  price,
  compareAtPrice,
  action,
}: ShownProduct & { action?: ReactNode }) {
  const media =
    image === null ? (
      <div className="cc-card__image-placeholder" aria-hidden="true" />
    ) : (
      <img
        className="cc-card__image"
        src={image.url}
        alt={image.alt ?? title}
        loading="lazy"
      />
    );
  const priceRow = (
    <ProductPrice price={price} compareAtPrice={compareAtPrice} />
  );

  if (action === undefined) {
    return (
      <a className="cc-card" href={productUrl(handle)}>
        <div className="cc-card__media">{media}</div>
        <div className="cc-card__body">
          <div className="cc-card__title">{title}</div>
          {priceRow}
        </div>
      </a>
    );
  }

  // A button can't sit inside an anchor, so the image and title link instead.
  const href = productUrl(handle);
  return (
    <div className="cc-card">
      <a className="cc-card__media" href={href}>
        {media}
      </a>
      <div className="cc-card__body">
        <a className="cc-card__title" href={href}>
          {title}
        </a>
        {priceRow}
        {action}
      </div>
    </div>
  );
}

function ShoppableCard({
  product,
  variants,
}: {
  product: ShownProduct;
  variants: NonNullable<ShownProduct["variants"]>;
}) {
  const picker = useVariantPicker(variants);
  return (
    <>
      <ProductCard {...product} action={<AddToCartButton picker={picker} />} />
      <VariantPicker picker={picker} options={product.options ?? []} />
    </>
  );
}

function HighlightIcon({ kind }: { kind: Highlight["kind"] }) {
  return (
    <svg
      className="cc-highlight__icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={kind === "pro" ? "M3 8.5l3.2 3L13 4.5" : "M4 4l8 8M12 4l-8 8"} />
    </svg>
  );
}

export default function ProductCards({
  products,
}: {
  products: ShownProduct[];
}) {
  return (
    <div className="cc-products">
      {products.map((product) => {
        const highlights = [
          ...(product.highlights ?? []).filter(({ kind }) => kind === "pro"),
          ...(product.highlights ?? []).filter(({ kind }) => kind === "con"),
        ];
        return (
          <div className="cc-product" key={product.handle}>
            {product.variants && product.variants.length > 0 ? (
              <ShoppableCard product={product} variants={product.variants} />
            ) : (
              <ProductCard {...product} />
            )}
            {highlights.length > 0 && (
              <ul className="cc-highlights">
                {highlights.map((highlight) => (
                  <li
                    className="cc-highlight"
                    data-kind={highlight.kind}
                    key={highlight.text}
                  >
                    <HighlightIcon kind={highlight.kind} />
                    <span>
                      <span className="cc-sr-only">
                        {highlight.kind === "pro" ? "Pro: " : "Con: "}
                      </span>
                      {highlight.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
