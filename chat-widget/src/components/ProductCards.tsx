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
            onLoad={(event) => {
              event.currentTarget.dataset.loaded = "true";
            }}
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
  return (
    <div className="cc-carousel">
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
