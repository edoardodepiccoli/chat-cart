import type { Highlight, ShownProduct } from "../../../shared/product";
import { productUrl } from "../urls";
import { ProductPrice } from "../components/Price";

function ProductCard({
  handle,
  title,
  image,
  price,
  compareAtPrice,
}: ShownProduct) {
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
        const highlights = product.highlights ?? [];
        return (
          <div className="cc-product" key={product.handle}>
            <ProductCard {...product} />
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
