import { useState } from "react";

import { variantNumber } from "../cart";
import { CartCheckIcon, CartIcon } from "../icons";
import { formatMoney } from "./money";
import ProductMedia from "./ProductMedia";
import {
  defaultSelectedOptions,
  findVariant,
  isOptionValueAvailable,
  replacePick,
} from "./variants";

export type Money = { amount: string; currencyCode: string };

export type ProductOption = { name: string; values: string[] };

export type SelectedOption = { name: string; value: string };

export type ProductVariant = {
  id: string;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
  available: boolean;
  imageUrl: string | null;
};

export type ProductImage = { url: string; alt: string | null };

export type ProductCardProps = {
  handle: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  selectedOptions?: SelectedOption[];
};

function pickedValue(picks: SelectedOption[], optionName: string): string {
  const pick = picks.find((candidate) => candidate.name === optionName);

  if (pick === undefined) {
    return "";
  }

  return pick.value;
}

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price: Money;
  compareAtPrice: Money | null;
}) {
  const isOnSale =
    compareAtPrice !== null &&
    Number(compareAtPrice.amount) > Number(price.amount);

  return (
    <div className="cc-card__price">
      <span>{formatMoney(Number(price.amount), price.currencyCode)}</span>
      {isOnSale && (
        <s className="cc-card__price--was">
          {formatMoney(
            Number(compareAtPrice.amount),
            compareAtPrice.currencyCode,
          )}
        </s>
      )}
    </div>
  );
}

export default function ProductCard({
  handle,
  title,
  imageUrl,
  imageAlt,
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
  const [picks, setPicks] = useState<SelectedOption[]>(
    () => selectedOptions ?? defaultSelectedOptions(variants),
  );
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);

  const selectedVariant = findVariant(variants, picks);
  const shownVariant = selectedVariant ?? variants[0];
  const shownImageUrl = shownVariant.imageUrl ?? imageUrl;
  const shownImages =
    images?.length || shownImageUrl === null
      ? (images ?? [])
      : [{ url: shownImageUrl, alt: imageAlt }];
  const hasChoice = variants.length > 1;
  const canAddToCart = selectedVariant !== null && selectedVariant.available;
  const inCart =
    selectedVariant !== null &&
    cartVariantIds.includes(variantNumber(selectedVariant.id));
  const productUrl = `/products/${handle}`;

  async function add() {
    if (selectedVariant === null) return;
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
        images={shownImages}
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
                  className="cc-select"
                  value={pickedValue(picks, option.name)}
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
          className="cc-card__add"
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

        <a className="cc-card__view" href={productUrl}>
          See product page
        </a>
      </div>
    </div>
  );
}
