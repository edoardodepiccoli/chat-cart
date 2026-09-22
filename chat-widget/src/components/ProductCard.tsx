import { useState } from "react";

import type { ProductOption } from "./types";

export default function ProductCard({
  title,
  price,
  imageUrl,
  productUrl,
  options,
}: {
  title: string;
  price: string;
  imageUrl: string;
  productUrl: string;
  options: ProductOption[];
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((option) => [option.name, option.values[0]])),
  );

  return (
    <div className="cc-card">
      <a className="cc-card__media" href={productUrl}>
        <img className="cc-card__image" src={imageUrl} alt={title} />
      </a>

      <div className="cc-card__body">
        <a className="cc-card__title" href={productUrl}>
          {title}
        </a>
        <div className="cc-card__price">{price}</div>

        <div className="cc-card__options">
          {options.map((option) => (
            <label className="cc-field" key={option.name}>
              <span className="cc-field__label">{option.name}</span>
              <select
                className="cc-select"
                value={selected[option.name]}
                onChange={(event) =>
                  setSelected((prev) => ({
                    ...prev,
                    [option.name]: event.target.value,
                  }))
                }
              >
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <button className="cc-card__add" type="button">
          Add to cart
        </button>

        <a className="cc-card__view" href={productUrl}>
          See product page
        </a>
      </div>
    </div>
  );
}
