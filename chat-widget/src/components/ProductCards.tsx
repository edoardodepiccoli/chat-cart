import ProductCard, { type ProductCardProps } from "./ProductCard";

export type ProductCardsProps = { products: ProductCardProps[] };

export default function ProductCards({ products }: ProductCardsProps) {
  return (
    <div className="cc-carousel">
      {products.map((product) => (
        <ProductCard key={product.handle} {...product} />
      ))}
    </div>
  );
}
