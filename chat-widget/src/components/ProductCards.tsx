import { useCallback, useEffect, useRef, useState } from "react";

import { findVariant, type Product } from "../../../shared/product";
import { productUrl } from "../cart";
import { t } from "../i18n";
import { HeartIcon } from "../icons";
import { ProductPrice } from "./Price";

function CompactProductCard({
  handle,
  title,
  images,
  variants,
  selectedOptions,
  onLike,
}: Product & { onLike: () => void }) {
  const shownVariant = findVariant(variants, selectedOptions) ?? variants[0];
  const shownImageUrl = shownVariant.imageUrl ?? images[0]?.url ?? null;
  const url = productUrl(handle);

  return (
    <div className="cc-card">
      <a className="cc-card__media" href={url}>
        {shownImageUrl === null ? (
          <div className="cc-card__image-placeholder" aria-hidden="true" />
        ) : (
          <img
            className="cc-card__image"
            src={shownImageUrl}
            alt={images[0]?.alt ?? title}
            loading="lazy"
          />
        )}
      </a>

      <div className="cc-card__body">
        <a className="cc-card__title" href={url}>
          {title}
        </a>

        <ProductPrice
          price={shownVariant.price}
          compareAtPrice={shownVariant.compareAtPrice}
        />

        <button className="cc-btn" type="button" onClick={onLike}>
          <HeartIcon className="cc-icon" />
          {t("iLikeThis")}
        </button>
      </div>
    </div>
  );
}

export default function ProductCards({
  products,
  onLike,
}: {
  products: Product[];
  onLike: (product: Product) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [moreStart, setMoreStart] = useState(false);
  const [moreEnd, setMoreEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const carousel = carouselRef.current;
    if (carousel === null) return;
    setMoreStart(carousel.scrollLeft > 1);
    setMoreEnd(
      carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel === null) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(carousel);
    return () => observer.disconnect();
  }, [updateEdges]);

  return (
    <div
      className="cc-carousel"
      ref={carouselRef}
      data-more-start={moreStart}
      data-more-end={moreEnd}
      onScroll={updateEdges}
    >
      {products.map((product) => (
        <CompactProductCard
          key={product.handle}
          {...product}
          onLike={() => onLike(product)}
        />
      ))}
    </div>
  );
}
