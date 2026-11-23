import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { formatBRL } from '../lib/format';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/petclick';
import { SmartImage } from './SmartImage';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { navigate, addToCart } = useStore();
  const totalStock = Math.max(0, (product.stockOwn || 0) + (product.stockSupplier || 0));
  const isOutOfStock = !product.available || totalStock <= 0;
  const hasPromo = Boolean(product.promoPrice && product.promoPrice > 0 && product.promoPrice < product.price);
  const effectivePrice = hasPromo ? product.promoPrice! : product.price;

  return (
    <article className="group bg-white border border-stone-200/90 rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col">
      <button
        type="button"
        onClick={() => navigate(`/produto/${product.slug || product.id}`)}
        className="block relative aspect-[4/3] w-full bg-stone-100 overflow-hidden text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-800"
      >
        <SmartImage
          src={product.images[0]}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-stone-500 truncate">
            <span className="font-medium text-emerald-900">{product.categoryName || 'PetClick'}</span>
            {product.brand && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{product.brand}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className={isOutOfStock ? 'text-red-700 font-medium' : 'text-stone-500'}>
              {isOutOfStock ? 'Indisponível' : hasPromo ? 'Oferta' : 'Em estoque'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/produto/${product.slug || product.id}`)}
            className="mt-1.5 text-left block w-full cursor-pointer"
          >
            <h3 className="text-[16px] font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-emerald-900 transition-colors">
              {product.name}
            </h3>
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-end justify-between gap-2">
          <div>
            {hasPromo && (
              <div className="text-xs text-stone-400 line-through font-mono-tabular">
                {formatBRL(product.price)}
              </div>
            )}
            <div className="text-[17px] font-bold text-stone-900 font-mono-tabular">
              {formatBRL(effectivePrice)}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => addToCart(product, 1, product.variants?.[0])}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed bg-emerald-900 text-white hover:bg-emerald-800"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Esgotado' : 'Adicionar'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
