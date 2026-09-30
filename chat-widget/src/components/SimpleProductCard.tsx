import { HeartIcon } from "../icons";
import type { ProductCardProps } from "../../../shared/chat";
import { findVariant } from "../../../shared/variants";
import { ProductPrice } from "./ProductCard";

export default function SimpleProductCard({
  handle,
  title,
  images,
  variants,
  selectedOptions,
  onLike,
}: ProductCardProps & { onLike: () => void }) {
  const shownVariant = findVariant(variants, selectedOptions) ?? variants[0];
  const shownImageUrl = shownVariant.imageUrl ?? images[0]?.url ?? null;
  const productUrl = `/products/${handle}`;

  return (
    <div className="cc-card">
      <a className="cc-card__media" href={productUrl}>
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
        <a className="cc-card__title" href={productUrl}>
          {title}
        </a>

        <ProductPrice
          price={shownVariant.price}
          compareAtPrice={shownVariant.compareAtPrice}
        />

        <button className="cc-card__like" type="button" onClick={onLike}>
          <HeartIcon className="cc-icon" />
          I like this
        </button>
      </div>
    </div>
  );
}
