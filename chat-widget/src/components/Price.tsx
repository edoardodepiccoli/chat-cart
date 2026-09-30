import type { Money } from "../../../shared/chat";

export function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
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
