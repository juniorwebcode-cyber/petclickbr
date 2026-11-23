import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Truck, RefreshCw, Headphones, Star } from 'lucide-react';
import { where, limit } from 'firebase/firestore';
import { subscribeCollection } from '../lib/firestoreService';
import { formatBRL } from '../lib/format';
import { resolveAssetUrl } from '../lib/imageManifest';
import { useStore } from '../context/StoreContext';
import type { Review } from '../types/petclick';
import { ProductCard } from '../components/ProductCard';
import { SmartImage } from '../components/SmartImage';

export const HomePage: React.FC = () => {
  const { navigate, products, productsLoading, categories, settings } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'bestsellers' | 'promos' | 'new'>('featured');
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [prevSlideIdx, setPrevSlideIdx] = useState<number | null>(null);
  const [slideTick, setSlideTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeCollection<Review>(
      'reviews',
      [where('approved', '==', true), limit(6)],
      setReviews,
      () => {}
    );
    return () => unsub();
  }, []);

  const heroCatalogSlides = useMemo(() => {
    return products.filter((p) => p.published && p.images && p.images.length > 0 && p.images[0]);
  }, [products]);

  const safeSlideIdx = heroCatalogSlides.length > 0 ? heroSlideIdx % heroCatalogSlides.length : 0;
  const activeHeroProduct = heroCatalogSlides[safeSlideIdx];
  const prevHeroProduct =
    prevSlideIdx !== null && prevSlideIdx !== safeSlideIdx ? heroCatalogSlides[prevSlideIdx] : undefined;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (heroCatalogSlides.length <= 1) return;
      const total = heroCatalogSlides.length;
      const normalized = ((nextIndex % total) + total) % total;
      setPrevSlideIdx(safeSlideIdx);
      setHeroSlideIdx(normalized);
      setSlideTick((t) => t + 1);
    },
    [heroCatalogSlides.length, safeSlideIdx]
  );

  useEffect(() => {
    if (heroCatalogSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      goToSlide(safeSlideIdx + 1);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [heroCatalogSlides.length, safeSlideIdx, goToSlide]);

  // Preload next registered product image for seamless background transitions
  useEffect(() => {
    if (heroCatalogSlides.length <= 1) return;
    const nextProd = heroCatalogSlides[(safeSlideIdx + 1) % heroCatalogSlides.length];
    const resolved = resolveAssetUrl(nextProd?.images?.[0]);
    if (resolved.primary) {
      const preload = new Image();
      preload.src = resolved.primary;
    }
  }, [heroCatalogSlides, safeSlideIdx]);

  const featuredProducts = products.filter((p) => p.featured);
  const bestSellerProducts = products.filter((p) => p.bestSeller);
  const promoProducts = products.filter((p) => p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.price);
  const newestProducts = products.slice(0, 8);

  const displayedProducts = (() => {
    if (activeTab === 'featured') return featuredProducts.length > 0 ? featuredProducts.slice(0, 8) : newestProducts;
    if (activeTab === 'bestsellers') return bestSellerProducts.length > 0 ? bestSellerProducts.slice(0, 8) : newestProducts;
    if (activeTab === 'promos') return promoProducts.slice(0, 8);
    return newestProducts;
  })();

  return (
    <div className="space-y-16 pb-8">
      {/* Hero Banner — Full-bleed One-by-One Product Showcase Background */}
      <section className="relative overflow-hidden bg-emerald-950 border-b border-emerald-900 min-h-[470px] lg:min-h-[540px] flex items-center">
        {/* Large One-by-One Product Photo Background Stage */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          {/* Luminous soft stage on right/center so studio & lifestyle product photos pop cleanly */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-[66%] bg-gradient-to-l from-white via-white/95 to-transparent" />

          {/* Exiting Product Photo (one-by-one transition out) */}
          {prevHeroProduct && (
            <div
              key={`hero-exit-${prevHeroProduct.id}-${slideTick}`}
              className="absolute inset-y-0 right-0 w-full lg:w-[62%] flex items-center justify-center p-6 sm:p-10 lg:p-12 hero-bg-exit"
            >
              <SmartImage
                src={prevHeroProduct.images[0]}
                alt=""
                className="w-full h-full max-h-[440px] object-contain"
              />
            </div>
          )}

          {/* Entering / Active Large Product Photo */}
          {activeHeroProduct && (
            <div
              key={`hero-enter-${activeHeroProduct.id}-${slideTick}`}
              className="absolute inset-y-0 right-0 w-full lg:w-[62%] flex items-center justify-center p-6 sm:p-10 lg:p-12 hero-bg-enter"
            >
              <SmartImage
                src={activeHeroProduct.images[0]}
                alt=""
                className="w-full h-full max-h-[440px] object-contain"
              />
            </div>
          )}

          {/* Calibrated Directional Emerald Contrast Scrim (Left text legibility + edge feathering) */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/92 lg:via-emerald-950/75 to-emerald-950/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-transparent to-emerald-950/35 lg:from-emerald-950/45 lg:to-emerald-950/15" />
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="max-w-xl flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-300">
              {settings.storeName} · {settings.slogan}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-white leading-[1.1] tracking-tight [text-wrap:balance]">
              {settings.heroTitle}
            </h1>
            <p className="text-base text-emerald-100/90 leading-relaxed max-w-xl">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/produtos')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg shadow-orange-950/30"
              >
                <span>{settings.heroCtaText || 'Explorar catálogo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/promocoes')}
                className="inline-flex items-center gap-2 px-5 py-3 border border-white/25 bg-emerald-900/60 hover:bg-emerald-800/80 text-white text-sm font-semibold rounded-lg backdrop-blur-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Ver ofertas
              </button>
            </div>
          </div>

          {/* Active Passing Product Caption & Controls */}
          {activeHeroProduct && (
            <div className="self-start lg:self-end bg-emerald-950/85 backdrop-blur-md border border-white/15 rounded-xl p-4 max-w-sm w-full sm:w-auto text-white shadow-xl space-y-2">
              <div className="flex items-center justify-between gap-4 text-[11px] text-emerald-200/85">
                <span className="truncate">
                  {activeHeroProduct.categoryName} · {activeHeroProduct.brand}
                </span>
                <span className="font-mono-tabular shrink-0">
                  {safeSlideIdx + 1}/{heroCatalogSlides.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/produto/${activeHeroProduct.slug || activeHeroProduct.id}`)}
                className="text-left block w-full group cursor-pointer"
              >
                <div className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">
                  {activeHeroProduct.name}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-base font-extrabold text-orange-300 font-mono-tabular">
                    {formatBRL(
                      activeHeroProduct.promoPrice &&
                        activeHeroProduct.promoPrice > 0 &&
                        activeHeroProduct.promoPrice < activeHeroProduct.price
                        ? activeHeroProduct.promoPrice
                        : activeHeroProduct.price
                    )}
                  </span>
                  <span className="text-xs font-semibold text-white/90 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    Ver produto <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
                <span className="text-[11px] text-emerald-200/75">Em exibição no fundo</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToSlide(safeSlideIdx - 1)}
                    aria-label="Produto anterior"
                    className="p-1.5 rounded-md hover:bg-white/10 text-emerald-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSlide(safeSlideIdx + 1)}
                    aria-label="Próximo produto"
                    className="p-1.5 rounded-md hover:bg-white/10 text-emerald-100 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Departamentos para seu pet</h2>
            <p className="text-sm text-stone-500 mt-1">
              Selecione a categoria ideal para cães, gatos, alimentação e bem-estar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/produtos')}
            className="text-sm font-semibold text-emerald-900 hover:text-orange-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ver todos →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/${cat.slug}`)}
              className="group bg-white border border-stone-200 rounded-xl overflow-hidden text-left hover:border-emerald-700 transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] w-full bg-stone-100 overflow-hidden">
                <SmartImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  fallbackLabel={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-stone-900 group-hover:text-emerald-900 truncate">
                  {cat.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Curated Showcase Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Vitrine PetClick</h2>
            <p className="text-sm text-stone-500 mt-1">
              Produtos publicados com preço e disponibilidade verificados em tempo real.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg self-start">
            {[
              ['featured', 'Destaques'],
              ['bestsellers', 'Mais vendidos'],
              ['new', 'Novidades'],
              ['promos', 'Promoções'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === key
                    ? 'bg-white text-emerald-950 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
            <h3 className="text-lg font-bold text-stone-900">
              {activeTab === 'promos'
                ? 'Nenhuma promoção ativa no momento'
                : 'Catálogo pronto para receber produtos reais'}
            </h3>
            <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto">
              Nenhum produto fictício é exibido na vitrine. Cadastre seus produtos ou importe o catálogo de um fornecedor via CSV/XML/API no Painel Administrativo.
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="mt-5 px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Acessar Painel Administrativo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Store Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Truck,
              title: 'Entrega com CEP real',
              desc: 'Cálculo transparente no checkout com modalidades configuradas da loja e Correios quando integrado.',
            },
            {
              icon: ShieldCheck,
              title: 'Pagamento via InfinitePay',
              desc: 'Checkout oficial via Pix ou Cartão com confirmação validada no servidor.',
            },
            {
              icon: RefreshCw,
              title: 'Troca garantida em 7 dias',
              desc: 'Política de trocas e devoluções alinhada ao Código de Defesa do Consumidor.',
            },
            {
              icon: Headphones,
              title: 'Atendimento especializado',
              desc: 'Suporte direto via WhatsApp e e-mail para escolher o melhor produto para seu pet.',
            },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="space-y-2">
                <Icon className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-bold text-stone-900">{b.title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Avaliações de clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-1 text-orange-500">
                  {Array.from({ length: Math.min(5, Math.max(1, rev.rating)) }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">“{rev.comment}”</p>
                <p className="text-xs font-semibold text-stone-500">{rev.customerName}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
