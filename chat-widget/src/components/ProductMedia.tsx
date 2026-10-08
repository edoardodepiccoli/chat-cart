import { useEffect, useRef, useState } from "react";

import { t } from "../i18n";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
import type { ProductImage } from "../../../shared/product";

export default function ProductMedia({
  images,
  title,
  productUrl,
  activeUrl,
}: {
  images: ProductImage[];
  title: string;
  productUrl: string;
  activeUrl: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const atStart = index === 0;
  const atEnd = index >= images.length - 1;

  function updateIndex() {
    const track = trackRef.current;
    if (track === null) return;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 1) {
      setIndex(images.length - 1);
      return;
    }
    const distances = [...track.children].map((slide) =>
      Math.abs((slide as HTMLElement).offsetLeft - track.scrollLeft),
    );
    setIndex(distances.indexOf(Math.min(...distances)));
  }

  function step(direction: number) {
    const track = trackRef.current;
    if (track === null) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  }

  const activeIndex = images.findIndex((image) => image.url === activeUrl);
  const syncedIndex = useRef(activeIndex);

  useEffect(() => {
    const track = trackRef.current;
    if (activeIndex === syncedIndex.current) return;
    syncedIndex.current = activeIndex;
    if (track === null || activeIndex === -1) return;
    const slide = track.children[activeIndex] as HTMLElement;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, [activeIndex]);

  if (images.length === 0) {
    return (
      <a className="cc-card__media" href={productUrl}>
        <div className="cc-card__image-placeholder" aria-hidden="true" />
      </a>
    );
  }

  return (
    <>
      <div className="cc-media">
        <div className="cc-media__track" ref={trackRef} onScroll={updateIndex}>
          {images.map((image) => (
            <a className="cc-media__slide" href={productUrl} key={image.url}>
              <img
                className="cc-card__image"
                src={image.url}
                alt={image.alt ?? title}
                loading="lazy"
                onLoad={(event) => {
                  event.currentTarget.dataset.loaded = "true";
                }}
              />
            </a>
          ))}
        </div>

        {!atStart && (
          <button
            className="cc-media__arrow cc-media__arrow--prev"
            type="button"
            aria-label={t("previousImage")}
            onClick={() => step(-1)}
          >
            <ChevronLeftIcon className="cc-icon" />
          </button>
        )}
        {!atEnd && (
          <button
            className="cc-media__arrow cc-media__arrow--next"
            type="button"
            aria-label={t("nextImage")}
            onClick={() => step(1)}
          >
            <ChevronRightIcon className="cc-icon" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="cc-media__dots" aria-hidden="true">
          {images.map((image, dot) => (
            <span
              className="cc-media__dot"
              data-active={dot === index}
              key={image.url}
            />
          ))}
        </div>
      )}
    </>
  );
}
