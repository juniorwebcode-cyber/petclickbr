import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { matchesDepartmentSlug } from '../lib/catalogSeed';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';

interface CatalogPageProps {
  initialCategorySlug?: string;
  onlyPromos?: boolean;
  pageTitle?: string;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategorySlug,
  onlyPromos = false,
  pageTitle,
}) => {
  const { products, categories, navigate, productsLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');

  const activeCategory = categories.find((c) => c.slug === initialCategorySlug);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = products.filter((p) => {
      if (onlyPromos && !(p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.price)) return false;
      if (initialCategorySlug) {
        if (!matchesDepartmentSlug(p, initialCategorySlug)) return false;
      }
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      const totalStock = (p.stockOwn || 0) + (p.stockSupplier || 0);
      if (onlyInStock && (!p.available || totalStock <= 0)) return false;
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.description} ${p.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => (a.promoPrice || a.price) - (b.promoPrice || b.price));
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => (b.promoPrice || b.price) - (a.promoPrice || a.price));
    }
    return list;
  }, [products, onlyPromos, initialCategorySlug, selectedBrand, onlyInStock, searchTerm, sortBy]);

  const heading = pageTitle || (onlyPromos ? 'Promoções PetClick' : activeCategory?.name || 'Todos os produtos');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <p className="text-xs font-medium text-stone-500">Catálogo oficial PetClick</p>
          <h1 className="text-3xl font-extrabold text-stone-900 mt-1">{heading}</h1>
          {activeCategory?.description && (
            <p className="text-sm text-stone-600 mt-1">{activeCategory.description}</p>
          )}
        </div>
        <div className="text-xs text-stone-500 font-mono-tabular">
          {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </div>
      </div>

      {/* Category Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            !initialCategorySlug && !onlyPromos
              ? 'bg-emerald-900 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => navigate(`/${cat.slug}`)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              initialCategorySlug === cat.slug
                ? 'bg-emerald-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('/promocoes')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            onlyPromos
              ? 'bg-orange-600 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          Promoções
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produto, marca ou SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-800"
          />
        </div>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-emerald-800"
        >
          <option value="all">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-emerald-800"
        >
          <option value="recent">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </select>

        <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer px-2">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-800"
          />
          <span>Somente disponíveis</span>
        </label>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-stone-900">
            Nenhum produto publicado corresponde a este filtro.
          </p>
          <p className="text-sm text-stone-500">
            Tente limpar a busca ou cadastre novos produtos no Painel Administrativo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
