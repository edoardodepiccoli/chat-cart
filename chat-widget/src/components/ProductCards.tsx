import { useCallback, useEffect, useRef, useState } from "react";

import type { ProductSummary } from "../../../shared/product";
import { productUrl } from "../urls";
import { ProductPrice } from "./Price";

function CompactProductCard({
  handle,
  title,
  image,
  price,
  compareAtPrice,
}: ProductSummary) {
  return (
    <a className="cc-card" href={productUrl(handle)}>
      <div className="cc-card__media">
        {image === null ? (
          <div className="cc-card__image-placeholder" aria-hidden="true" />
        ) : (
          <img
            className="cc-card__image"
            src={image.url}
            alt={image.alt ?? title}
            loading="lazy"
          />
        )}
      </div>

      <div className="cc-card__body">
        <div className="cc-card__title">{title}</div>
        <ProductPrice price={price} compareAtPrice={compareAtPrice} />
      </div>
    </a>
  );
}

export default function ProductCards({
  products,
}: {
  products: ProductSummary[];
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
        <CompactProductCard key={product.handle} {...product} />
      ))}
    </div>
  );
}
