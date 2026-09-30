import type { ProductCardProps, ProductCardsProps } from "../../../shared/chat";
import SimpleProductCard from "./SimpleProductCard";

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
