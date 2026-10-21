import { useRef, type ReactNode } from "react";

import type {
  Highlight,
  ShownProduct,
  ShownVariant,
} from "../../../shared/product";
import { discountPercent, ProductPrice } from "../components/Price";
import { useCarousel } from "../hooks/useCarousel";
import { t } from "../i18n";
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { productUrl } from "../urls";
import { AddToCartButton, useVariantPicker } from "./AddToCart";
import VariantSheet from "./VariantSheet";

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

function ProductCard({
  product,
  shown = null,
  soldOut = false,
  action,
  error = null,
}: {
  product: ShownProduct;
  // A variant the shopper added, whose price and image replace the product's.
  shown?: ShownVariant | null;
  soldOut?: boolean;
  action?: ReactNode;
  error?: string | null;
}) {
  const href = productUrl(product.handle);
  const imageUrl = shown?.imageUrl ?? product.image?.url ?? null;
  const price = shown?.price ?? product.price;
  const compareAtPrice = shown ? shown.compareAtPrice : product.compareAtPrice;
  const percent = discountPercent(price, compareAtPrice);
  const highlights = [
    ...(product.highlights ?? []).filter(({ kind }) => kind === "pro"),
    ...(product.highlights ?? []).filter(({ kind }) => kind === "con"),
  ];

  return (
    <article className="cc-pcard" data-sold-out={soldOut}>
      {/* The title link names the product; this one only widens the target. */}
      <a
        className="cc-pcard__media"
        href={href}
        tabIndex={-1}
        aria-hidden="true"
      >
        {imageUrl ? (
          <img
            className="cc-pcard__image"
            src={imageUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="cc-pcard__placeholder" />
        )}
        {percent > 0 && (
          <span className="cc-pcard__badge">
            {t("saleBadge", { percent: String(percent) })}
          </span>
        )}
      </a>
      <div className="cc-pcard__body">
        <a className="cc-pcard__title" href={href}>
          {product.title}
        </a>
        <div className="cc-pcard__buy">
          <ProductPrice price={price} compareAtPrice={compareAtPrice} />
          {action}
        </div>
        {error !== null && (
          <p className="cc-pcard__error" role="alert">
            <AlertIcon className="cc-icon" />
            {error}
          </p>
        )}
      </div>
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
    </article>
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
      <ProductCard
        product={product}
        shown={picker.shown}
        soldOut={picker.soldOut}
        action={<AddToCartButton picker={picker} />}
        // With variants, a failed add shows in the sheet, which stays open.
        error={picker.multiple ? null : picker.error}
      />
      {picker.multiple && <VariantSheet picker={picker} product={product} />}
    </>
  );
}

export default function ProductCards({
  products,
}: {
  products: ShownProduct[];
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const carousel = useCarousel(trackRef, products.length);

  return (
    <section
      className="cc-carousel"
      data-count={products.length}
      aria-roledescription={t("carouselRole")}
      aria-label={t("carousel")}
    >
      <ul className="cc-carousel__track" ref={trackRef}>
        {products.map((product) => (
          <li className="cc-carousel__item" key={product.handle}>
            {product.variants && product.variants.length > 0 ? (
              <ShoppableCard product={product} variants={product.variants} />
            ) : (
              <ProductCard product={product} />
            )}
          </li>
        ))}
      </ul>
      {carousel.overflow && (
        <div className="cc-carousel__controls">
          <span className="cc-carousel__count" aria-live="polite">
            {t("pageRange", {
              from: String(carousel.first + 1),
              to: String(carousel.last + 1),
              total: String(products.length),
            })}
          </span>
          <div className="cc-carousel__arrows">
            <button
              type="button"
              className="cc-carousel__arrow"
              aria-label={t("previous")}
              disabled={carousel.first === 0}
              onClick={() => carousel.step(-1)}
            >
              <ChevronLeftIcon className="cc-icon" />
            </button>
            <button
              type="button"
              className="cc-carousel__arrow"
              aria-label={t("next")}
              disabled={carousel.last === products.length - 1}
              onClick={() => carousel.step(1)}
            >
              <ChevronRightIcon className="cc-icon" />
            </button>
          </div>
          <div className="cc-carousel__dots" aria-hidden="true">
            {products.map((product, index) => (
              <span
                className="cc-carousel__dot"
                data-active={index === carousel.first}
                key={product.handle}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
