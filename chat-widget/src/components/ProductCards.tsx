import type { ProductCardProps } from "./ProductCard";
import SimpleProductCard from "./SimpleProductCard";

export type ProductCardsProps = { products: ProductCardProps[] };

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
