import type { Money } from "../../../shared/product";
import { getLocale } from "../i18n";

export function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

// The whole-number discount off the compare-at price, or 0 when not on sale.
export function discountPercent(
  price: Money,
  compareAtPrice: Money | null,
): number {
  const was = Number(compareAtPrice?.amount ?? 0);
  const now = Number(price.amount);
  if (!(was > now)) return 0;
  return Math.round((1 - now / was) * 100);
}

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price: Money;
  compareAtPrice: Money | null;
}) {
  const isOnSale = discountPercent(price, compareAtPrice) > 0;

  return (
    <div className="cc-price">
      <span>{formatMoney(Number(price.amount), price.currencyCode)}</span>
      {isOnSale && compareAtPrice && (
        <s className="cc-price__was">
          {formatMoney(
            Number(compareAtPrice.amount),
            compareAtPrice.currencyCode,
          )}
        </s>
      )}
    </div>
  );
}
