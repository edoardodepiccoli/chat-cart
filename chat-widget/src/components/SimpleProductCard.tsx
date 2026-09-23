import { ProductPrice, type ProductCardProps } from "./ProductCard";

export default function SimpleProductCard({
  handle,
  title,
  imageUrl,
  imageAlt,
  variants,
  onLike,
}: ProductCardProps & { onLike: () => void }) {
  const shownVariant =
    variants.find((variant) => variant.available) ?? variants[0];
  const shownImageUrl = shownVariant.imageUrl ?? imageUrl;
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
            alt={imageAlt ?? title}
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
          I like this
        </button>
      </div>
    </div>
  );
}
