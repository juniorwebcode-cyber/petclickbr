import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatBRL } from '../lib/format';
import { calculateCartTotals } from '../lib/pos';
import { useStore } from '../context/StoreContext';
import { SmartImage } from './SmartImage';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    appliedCoupon,
    shippingSettings,
    navigate,
  } = useStore();

  if (!cartDrawerOpen) return null;

  const { subtotal, discountTotal } = calculateCartTotals(cart, 0, appliedCoupon);
  const freeThreshold = shippingSettings.freeShippingEnabled ? shippingSettings.freeShippingMinOrder : 0;
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={() => setCartDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-stone-200">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-900" />
            <h2 className="text-lg font-bold text-stone-900">Sua sacola</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Fechar sacola"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {freeThreshold > 0 && cart.length > 0 && (
          <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-950">
            {remainingForFree === 0 ? (
              <span className="font-medium">Você atingiu o valor mínimo para Frete Grátis promocional.</span>
            ) : (
              <span>
                Faltam <strong className="font-mono-tabular">{formatBRL(remainingForFree)}</strong> para atingir frete grátis da loja.
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-stone-300 mb-3" />
              <p className="text-base font-semibold text-stone-800">Sua sacola está vazia</p>
              <p className="mt-1 text-sm text-stone-500 max-w-xs">
                Explore nossa seleção para cães e gatos e adicione os itens favoritos do seu pet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/produtos');
                }}
                className="mt-5 px-5 py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Ver produtos
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}_${item.variantId || 'default'}`}
                className="flex gap-4 pb-4 border-b border-stone-100"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                  <SmartImage src={item.image} alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCartDrawerOpen(false);
                      navigate(`/produto/${item.slug || item.productId}`);
                    }}
                    className="text-sm font-semibold text-stone-900 hover:text-emerald-900 text-left line-clamp-2 cursor-pointer"
                  >
                    {item.name}
                  </button>
                  {item.variantLabel && (
                    <p className="text-xs text-stone-500 mt-0.5">{item.variantLabel}</p>
                  )}
                  <p className="text-sm font-bold text-stone-900 font-mono-tabular mt-1">
                    {formatBRL(item.unitPrice)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border border-stone-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)}
                        aria-label="Diminuir quantidade"
                        className="p-1.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold font-mono-tabular">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)}
                        aria-label="Aumentar quantidade"
                        className="p-1.5 text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      aria-label="Remover item"
                      className="p-1.5 text-stone-400 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{formatBRL(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm text-emerald-800">
                <span>Desconto ({appliedCoupon?.code})</span>
                <span className="font-mono-tabular font-semibold">-{formatBRL(discountTotal)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/carrinho');
                }}
                className="px-4 py-2.5 border border-stone-300 bg-white text-stone-800 text-xs font-semibold rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Ver carrinho
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Finalizar pedido
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
