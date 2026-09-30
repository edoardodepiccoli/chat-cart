import { useState } from "react";

import type {
  ProductCardProps,
  ProductVariant,
  SelectedOption,
} from "../../../shared/chat";
import { variantNumber } from "../cart";
import { CartCheckIcon, CartIcon } from "../icons";
import { ProductPrice } from "./Price";
import ProductMedia from "./ProductMedia";
import {
  findVariant,
  isOptionValueAvailable,
  replacePick,
} from "../../../shared/variants";

export default function ProductCard({
  handle,
  title,
  images,
  options,
  variants,
  selectedOptions,
  cartVariantIds,
  onAdd,
}: ProductCardProps & {
  cartVariantIds: number[];
  onAdd: (variant: ProductVariant) => Promise<void>;
}) {
  const [picks, setPicks] = useState<SelectedOption[]>(selectedOptions);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);

  const selectedVariant = findVariant(variants, picks);
  const shownVariant = selectedVariant ?? variants[0];
  const shownImageUrl = shownVariant.imageUrl ?? images[0]?.url ?? null;
  const hasChoice = variants.length > 1;
  const canAddToCart = selectedVariant?.available ?? false;
  const inCart =
    selectedVariant !== undefined &&
    cartVariantIds.includes(variantNumber(selectedVariant.id));
  const productUrl = `/products/${handle}`;

  async function add() {
    if (selectedVariant === undefined) return;
    setAdding(true);
    setFailed(false);
    try {
      await onAdd(selectedVariant);
    } catch {
      setFailed(true);
    } finally {
      setAdding(false);
    }
  }

  function addLabel() {
    if (inCart) return "Added";
    if (!canAddToCart) return "Sold out";
    if (adding) return "Adding…";
    if (failed) return "Try again";
    return "Add to cart";
  }

  return (
    <div className="cc-card">
      <ProductMedia
        images={images}
        title={title}
        productUrl={productUrl}
        activeUrl={shownImageUrl}
      />

      <div className="cc-card__body">
        <a className="cc-card__title" href={productUrl}>
          {title}
        </a>

        <ProductPrice
          price={shownVariant.price}
          compareAtPrice={shownVariant.compareAtPrice}
        />

        {hasChoice && (
          <div className="cc-card__options">
            {options.map((option) => (
              <label className="cc-field" key={option.name}>
                <span className="cc-field__label">{option.name}</span>
                <select
                  className="cc-control cc-select"
                  value={
                    picks.find((pick) => pick.name === option.name)?.value ??
                    ""
                  }
                  onChange={(event) =>
                    setPicks((current) =>
                      replacePick(current, option.name, event.target.value),
                    )
                  }
                >
                  {option.values.map((value) => (
                    <option
                      key={value}
                      value={value}
                      disabled={
                        !isOptionValueAvailable(
                          variants,
                          picks,
                          option.name,
                          value,
                        )
                      }
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <button
          className="cc-btn"
          type="button"
          disabled={!canAddToCart || adding || inCart}
          data-added={inCart}
          onClick={add}
        >
          {inCart ? (
            <CartCheckIcon className="cc-icon" />
          ) : (
            <CartIcon className="cc-icon" />
          )}
          {addLabel()}
        </button>

        <a className="cc-btn cc-btn--secondary" href={productUrl}>
          See product page
        </a>
      </div>
    </div>
  );
}
