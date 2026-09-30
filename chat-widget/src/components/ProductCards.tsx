import type { ProductCardProps, ProductCardsProps } from "../../../shared/chat";
import { findVariant } from "../../../shared/variants";
import { HeartIcon } from "../icons";
import { ProductPrice } from "./Price";

function SimpleProductCard({
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

export default function ProductCards({
  products,
  onLike,
}: ProductCardsProps & { onLike: (product: ProductCardProps) => void }) {
  return (
    <div className="cc-carousel">
      {products.map((product) => (
        <SimpleProductCard
          key={product.handle}
          {...product}
          onLike={() => onLike(product)}
        />
      ))}
    </div>
  );
}
