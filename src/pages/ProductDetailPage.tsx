import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag, Star, Truck, PackageCheck } from 'lucide-react';
import { where } from 'firebase/firestore';
import { formatBRL, formatCep, formatDateBR, isValidCep } from '../lib/format';
import { submitReview, subscribeCollection } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import type { ProductVariant, Review, ShippingOption } from '../types/petclick';
import { SmartImage } from '../components/SmartImage';
import { fetchApiJson } from '../lib/http';

export const ProductDetailPage: React.FC<{ slugOrId: string }> = ({ slugOrId }) => {
  const { products, navigate, addToCart, shippingSettings } = useStore();
  const { firebaseUser, profile } = useAuth();

  const product = products.find((p) => p.slug === slugOrId || p.id === slugOrId);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product?.variants?.[0]
  );
  const [qty, setQty] = useState(1);

  const [cepInput, setCepInput] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingNote, setShippingNote] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    setSelectedVariant(product?.variants?.[0]);
    setSelectedImageIdx(0);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const unsub = subscribeCollection<Review>(
      'reviews',
      [where('productId', '==', product.id), where('approved', '==', true)],
      setReviews,
      () => {}
    );
    return () => unsub();
  }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">Produto não encontrado</h1>
        <p className="text-sm text-stone-600">
          Este item pode estar indisponível ou ter sido despublicado do catálogo.
        </p>
        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className="px-5 py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          Voltar para produtos
        </button>
      </div>
    );
  }

  const totalStock = selectedVariant
    ? Math.max(0, (selectedVariant.stockOwn || 0) + (selectedVariant.stockSupplier || 0))
    : Math.max(0, (product.stockOwn || 0) + (product.stockSupplier || 0));
  const isAvailable = product.available && totalStock > 0;
  const hasPromo = Boolean(product.promoPrice && product.promoPrice > 0 && product.promoPrice < product.price);
  const basePrice = hasPromo ? product.promoPrice! : product.price;
  const effectivePrice = Number((basePrice + (selectedVariant?.priceDelta || 0)).toFixed(2));

  const handleQuoteShipping = async () => {
    if (!isValidCep(cepInput)) {
      setShippingNote('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setShippingLoading(true);
    setShippingNote('');
    try {
      const res = await fetchApiJson<{
        options?: ShippingOption[];
        correiosStatusMessage?: string;
      }>('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep: cepInput,
          subtotal: effectivePrice * qty,
          weightKg: Math.max(0.3, (product.weightKg || 0.5) * qty),
          heightCm: product.heightCm || 12,
          widthCm: product.widthCm || 16,
          lengthCm: Math.min(100, (product.lengthCm || 20) * qty),
          storeShippingSettings: shippingSettings,
        }),
      });
      if (!res.ok) {
        setShippingNote(res.data.error || 'Erro ao calcular frete.');
      } else {
        setShippingOptions(res.data.options || []);
        setShippingNote(res.data.correiosStatusMessage || '');
      }
    } catch {
      setShippingNote('Erro ao calcular frete.');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      setReviewNotice('Faça login para enviar uma avaliação.');
      return;
    }
    if (comment.trim().length < 3) {
      setReviewNotice('Escreva um comentário com pelo menos 3 caracteres.');
      return;
    }
    await submitReview({
      productId: product.id,
      customerId: firebaseUser.uid,
      customerName: profile?.name || firebaseUser.displayName || 'Cliente PetClick',
      rating,
      comment: comment.trim(),
    });
    setComment('');
    setReviewNotice('Avaliação enviada! Será exibida na loja após moderação.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <button
        type="button"
        onClick={() => navigate('/produtos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-emerald-900 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao catálogo</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <SmartImage
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.name}
              fallbackLabel={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer ${
                    idx === selectedImageIdx ? 'border-emerald-900' : 'border-stone-200'
                  }`}
                >
                  <SmartImage src={img} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Sticky Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 lg:sticky lg:top-28">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-semibold text-emerald-900">{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">SKU {product.sku}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
            {product.name}
          </h1>

          <div>
            {hasPromo && (
              <div className="text-sm text-stone-400 line-through font-mono-tabular">
                {formatBRL(product.price)}
              </div>
            )}
            <div className="text-3xl font-extrabold text-stone-900 font-mono-tabular">
              {formatBRL(effectivePrice)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Pix ou Cartão via InfinitePay Checkout Seguro
            </p>
          </div>

          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-stone-700">Selecione a variação:</div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      selectedVariant?.id === v.id
                        ? 'border-emerald-900 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2.5">
            <PackageCheck className="w-4 h-4 text-emerald-800 shrink-0" />
            <div>
              {isAvailable ? (
                <span>
                  Disponível ({totalStock} {totalStock === 1 ? 'unidade' : 'unidades'} ·{' '}
                  {product.sourceType === 'dropshipping'
                    ? 'Envio direto do fornecedor autorizado'
                    : 'Estoque próprio PetClick'}
                  )
                </span>
              ) : (
                <span className="text-red-700 font-semibold">Produto temporariamente indisponível</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={Math.max(1, totalStock)}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(totalStock || 1, Number(e.target.value) || 1)))}
              className="w-20 px-3 py-2.5 border border-stone-300 rounded-lg text-sm font-mono-tabular text-center"
            />
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => addToCart(product, qty, selectedVariant)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAvailable ? 'Adicionar à sacola' : 'Indisponível'}</span>
            </button>
          </div>

          {/* CEP Quick Shipping */}
          <div className="pt-4 border-t border-stone-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <Truck className="w-4 h-4 text-emerald-800" />
              <span>Simular prazo e frete</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={cepInput}
                onChange={(e) => setCepInput(formatCep(e.target.value))}
                placeholder="00000-000"
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono-tabular"
              />
              <button
                type="button"
                onClick={handleQuoteShipping}
                disabled={shippingLoading}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {shippingLoading ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
            {shippingOptions.length > 0 && (
              <div className="space-y-1.5 text-xs">
                {shippingOptions.map((opt) => (
                  <div key={opt.id} className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-700">
                      {opt.label} ({opt.estimatedDays} dias úteis)
                    </span>
                    <span className="font-mono-tabular font-semibold text-stone-900">
                      {opt.price === 0 ? 'Grátis' : formatBRL(opt.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {shippingNote && <p className="text-[11px] text-stone-500">{shippingNote}</p>}
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Descrição e especificações</h2>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-100 text-xs">
            <div>
              <span className="text-stone-500 block">Peso</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{product.weightKg} kg</span>
            </div>
            <div>
              <span className="text-stone-500 block">Altura</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{product.heightCm} cm</span>
            </div>
            <div>
              <span className="text-stone-500 block">Largura</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{product.widthCm} cm</span>
            </div>
            <div>
              <span className="text-stone-500 block">Comprimento</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{product.lengthCm} cm</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">Avaliações ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-xs text-stone-500">Este produto ainda não possui avaliações publicadas.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="pb-3 border-b border-stone-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900">{r.customerName}</span>
                    <span className="text-[11px] text-stone-400">{formatDateBR(r.createdAt)}</span>
                  </div>
                  <div className="flex gap-0.5 text-orange-500">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-stone-700">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleReviewSubmit} className="pt-3 border-t border-stone-200 space-y-3">
            <div className="text-xs font-semibold text-stone-800">Avaliar este produto</div>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs"
            >
              <option value={5}>5 estrelas — Excelente</option>
              <option value={4}>4 estrelas — Muito bom</option>
              <option value={3}>3 estrelas — Bom</option>
              <option value={2}>2 estrelas — Regular</option>
              <option value={1}>1 estrela — Insatisfatório</option>
            </select>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi a experiência do seu pet..."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs"
            />
            {reviewNotice && <p className="text-xs text-emerald-800">{reviewNotice}</p>}
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-900 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              Enviar avaliação
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
