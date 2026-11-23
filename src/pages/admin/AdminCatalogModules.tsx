import React, { useMemo, useState } from 'react';
import { Download, Plus, RefreshCw, Trash2, Upload, Copy, Lock, Unlock } from 'lucide-react';
import { formatBRL, formatDateTimeBR, slugify } from '../../lib/format';
import { calculateRealProfit, calculateSalePrice, canAutoUpdatePrice } from '../../lib/pricing';
import {
  exportRowsToCsv,
  generateSupplierCsvTemplate,
  parseSupplierCsv,
  parseSupplierXml,
  type ParsedSupplierRow,
} from '../../lib/csv';
import {
  adjustProductStock,
  deleteCategory,
  deleteProduct,
  deleteSupplier,
  initializeDefaultCategoriesIfEmpty,
  saveCategory,
  saveProduct,
  saveSupplier,
  saveSupplierProduct,
  syncSeedCatalogToFirestore,
  writeAuditLog,
} from '../../lib/firestoreService';
import { PETCLICK_IMAGES } from '../../lib/defaults';
import { useAuth } from '../../context/AuthContext';
import { SmartImage } from '../../components/SmartImage';
import type {
  Category,
  InventoryMovement,
  Product,
  ProductSourceType,
  RoundingMode,
  StorefrontSettings,
  Supplier,
} from '../../types/petclick';

interface CatalogModulesProps {
  section: 'products' | 'categories' | 'suppliers' | 'imports' | 'inventory';
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  movements: InventoryMovement[];
  settings: StorefrontSettings;
}

export const AdminCatalogModules: React.FC<CatalogModulesProps> = ({
  section,
  products,
  categories,
  suppliers,
  movements,
  settings,
}) => {
  const { firebaseUser, profile, getAuthHeaders } = useAuth();
  const actorUid = firebaseUser?.uid || 'admin_session';
  const actorEmail = profile?.email || firebaseUser?.email || 'admin@x.com';

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  const handleSyncCatalogToDb = async () => {
    if (!firebaseUser) {
      setErrorMsg('Conecte sua conta Google de administrador no topo do painel para gravar os 82 produtos no Firestore.');
      return;
    }
    setSyncingCatalog(true);
    setErrorMsg('');
    setNotice('');
    try {
      const res = await syncSeedCatalogToFirestore(firebaseUser.uid, actorEmail);
      setNotice(
        `Sincronização concluída no Firestore: ${res.categoriesSaved} categorias, ${res.productsCreated} produto(s) criado(s) e ${res.productsUpdated} atualizado(s).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao sincronizar catálogo no Firestore.');
    } finally {
      setSyncingCatalog(false);
    }
  };

  // --- Product Filters & Bulk ---
  const [filterCat, setFilterCat] = useState('all');
  const [filterSup, setFilterSup] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'hidden' | 'low_stock' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMargin, setBulkMargin] = useState(60);

  // --- Product Editor Modal / Form ---
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  // --- Category Form ---
  const [catName, setCatName] = useState('');
  const [catMargin, setCatMargin] = useState(55);
  const [catImg, setCatImg] = useState(PETCLICK_IMAGES.dogNutrition);

  // --- Supplier Form ---
  const [supName, setSupName] = useState('');
  const [supType, setSupType] = useState<Supplier['connectorType']>('csv');
  const [supUrl, setSupUrl] = useState('');
  const [supToken, setSupToken] = useState('');
  const [supMargin, setSupMargin] = useState(60);
  const [supSurcharge, setSupSurcharge] = useState(0);
  const [supFreq, setSupFreq] = useState<Supplier['syncFrequency']>('manual');

  // --- Import State ---
  const [importSupplierId, setImportSupplierId] = useState('');
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'csv' | 'xml'>('csv');
  const [parsedPreview, setParsedPreview] = useState<ParsedSupplierRow[]>([]);
  const [importRounding, setImportRounding] = useState<RoundingMode>(settings.roundingMode || 'cents_90');
  const [overrideLockedPrices, setOverrideLockedPrices] = useState(false);

  // --- Inventory Adjustment State ---
  const [adjProductId, setAdjProductId] = useState('');
  const [adjBucket, setAdjBucket] = useState<'own' | 'supplier'>('own');
  const [adjType, setAdjType] = useState<InventoryMovement['type']>('in');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('');

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (filterCat !== 'all' && p.categoryId !== filterCat) return false;
      if (filterSup !== 'all' && p.supplierId !== filterSup) return false;
      const tot = (p.stockOwn || 0) + (p.stockSupplier || 0);
      if (filterStatus === 'published' && !p.published) return false;
      if (filterStatus === 'hidden' && p.published) return false;
      if (filterStatus === 'out' && tot > 0) return false;
      if (filterStatus === 'low_stock' && (tot === 0 || tot > (p.minStockAlert || 5))) return false;
      if (q && !`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, filterCat, filterSup, filterStatus, searchTerm]);

  const downloadTextFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- SECTION 2: PRODUCTS ---
  if (section === 'products') {
    const openNewProduct = () => {
      const defaultCat = categories[0];
      setEditing({
        name: '',
        sku: `PET-${Date.now().toString().slice(-6)}`,
        barcode: '',
        brand: '',
        categoryId: defaultCat?.id || 'caes',
        categoryName: defaultCat?.name || 'Cães',
        supplierId: '',
        sourceType: 'own_stock',
        costPrice: 0,
        markupPercent: defaultCat?.defaultMarginPercent || settings.defaultMarginPercent || 60,
        price: 0,
        promoPrice: 0,
        manualPriceLocked: false,
        stockOwn: 10,
        stockSupplier: 0,
        stockReserved: 0,
        minStockAlert: 5,
        available: true,
        published: true,
        featured: false,
        bestSeller: false,
        weightKg: 0.5,
        heightCm: 12,
        widthCm: 16,
        lengthCm: 22,
        images: [PETCLICK_IMAGES.dogNutrition],
        variants: [],
      });
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editing || !editing.name || !editing.categoryId) return;
      setErrorMsg('');
      try {
        const cat = categories.find((c) => c.id === editing.categoryId);
        const totalStock = (editing.stockOwn || 0) + (editing.stockSupplier || 0);
        if (editing.published && (Number(editing.price) <= 0 || totalStock <= 0)) {
          setErrorMsg('Não é permitido publicar produto sem preço válido (> R$ 0,00) e disponibilidade em estoque.');
          return;
        }
        const savedId = await saveProduct(
          {
            ...editing,
            name: editing.name,
            slug: editing.slug || slugify(editing.name),
            categoryId: editing.categoryId,
            categoryName: cat?.name || editing.categoryName || editing.categoryId,
            price: Number(editing.price) || 0,
            costPrice: Number(editing.costPrice) || 0,
          },
          actorEmail
        );
        await writeAuditLog({
          actorUid,
          actorEmail,
          action: editing.id ? 'update_product' : 'create_product',
          module: 'products',
          details: `Produto ${editing.name} (${savedId}) salvo por ${formatBRL(editing.price)}`,
        });
        setEditing(null);
        setNotice(`Produto "${editing.name}" salvo com sucesso.`);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar produto.');
      }
    };

    const handleBulkPublish = async (published: boolean) => {
      for (const id of selectedIds) {
        const p = products.find((x) => x.id === id);
        if (!p) continue;
        await saveProduct({ ...p, published }, actorEmail);
      }
      setSelectedIds([]);
      setNotice(`Atualizado status de publicação de ${selectedIds.length} produto(s).`);
    };

    const handleBulkApplyMargin = async () => {
      let skipped = 0;
      for (const id of selectedIds) {
        const p = products.find((x) => x.id === id);
        if (!p) continue;
        if (!canAutoUpdatePrice(p.manualPriceLocked, false)) {
          skipped++;
          continue;
        }
        const calc = calculateSalePrice({
          costPrice: p.costPrice,
          individualMarginPercent: bulkMargin,
          roundingMode: settings.roundingMode,
        });
        await saveProduct({ ...p, markupPercent: bulkMargin, price: calc.finalPrice }, actorEmail);
      }
      setSelectedIds([]);
      setNotice(`Margem em lote aplicada. ${skipped} produto(s) com preço manual protegido foram preservados.`);
    };

    const profitPreview = editing
      ? calculateRealProfit({
          salePrice: Number(editing.promoPrice && editing.promoPrice > 0 ? editing.promoPrice : editing.price) || 0,
          productCost: Number(editing.costPrice) || 0,
          paymentFeePercent: settings.paymentFeePercent || 3.19,
        })
      : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">Produtos e Precificação</h1>
            <p className="text-xs text-stone-500">
              {products.length} cadastrados · Proteção ativa contra publicação sem preço/estoque válido
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncingCatalog}
              onClick={() => void handleSyncCatalogToDb()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-800 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingCatalog ? 'animate-spin' : ''}`} />
              <span>{syncingCatalog ? 'Gravando no Firestore...' : 'Sincronizar 82 produtos no Firestore'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const csv = exportRowsToCsv(
                  ['ID', 'SKU', 'Nome', 'Categoria', 'Custo', 'Margem%', 'Preço', 'EstoquePróprio', 'EstoqueFornecedor', 'Publicado'],
                  filteredProducts.map((p) => [
                    p.id,
                    p.sku,
                    p.name,
                    p.categoryName,
                    p.costPrice,
                    p.markupPercent,
                    p.price,
                    p.stockOwn,
                    p.stockSupplier,
                    p.published ? 'Sim' : 'Não',
                  ])
                );
                downloadTextFile('petclick-produtos.csv', csv);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 bg-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={openNewProduct}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo produto</span>
            </button>
          </div>
        </div>

        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

        {/* Filters */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome, SKU ou marca..."
            className="px-3 py-2 border border-stone-200 rounded-lg text-xs"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterSup}
            onChange={(e) => setFilterSup(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white"
          >
            <option value="all">Todos os fornecedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white"
          >
            <option value="all">Todos os status</option>
            <option value="published">Publicados</option>
            <option value="hidden">Ocultos</option>
            <option value="low_stock">Estoque baixo</option>
            <option value="out">Sem estoque</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-950 text-white rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>{selectedIds.length} produto(s) selecionado(s)</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleBulkPublish(true)}
                className="px-3 py-1.5 bg-emerald-700 rounded-md cursor-pointer"
              >
                Publicar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkPublish(false)}
                className="px-3 py-1.5 bg-stone-700 rounded-md cursor-pointer"
              >
                Ocultar
              </button>
              <input
                type="number"
                value={bulkMargin}
                onChange={(e) => setBulkMargin(Number(e.target.value))}
                className="w-16 px-2 py-1 text-stone-900 rounded bg-white font-mono-tabular"
              />
              <button
                type="button"
                onClick={() => void handleBulkApplyMargin()}
                className="px-3 py-1.5 bg-orange-600 rounded-md cursor-pointer"
              >
                Aplicar margem %
              </button>
            </div>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filteredProducts.map((p) => p.id) : [])
                    }
                  />
                </th>
                <th className="p-3 font-semibold">Produto</th>
                <th className="p-3 font-semibold">Origem</th>
                <th className="p-3 font-semibold text-right">Custo</th>
                <th className="p-3 font-semibold text-right">Margem</th>
                <th className="p-3 font-semibold text-right">Preço</th>
                <th className="p-3 font-semibold text-right">Estoque</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-stone-500">
                    Nenhum produto cadastrado ainda. Clique em “Novo produto” ou use o módulo “Importações” para carregar seu catálogo CSV.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const tot = (p.stockOwn || 0) + (p.stockSupplier || 0);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                            )
                          }
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                            <SmartImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-semibold text-stone-900">{p.name}</div>
                            <div className="text-[11px] text-stone-500">
                              {p.categoryName} · SKU {p.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-stone-600">
                        {p.sourceType === 'dropshipping' ? 'Fornecedor' : 'Próprio'}
                      </td>
                      <td className="p-3 text-right font-mono-tabular">{formatBRL(p.costPrice)}</td>
                      <td className="p-3 text-right font-mono-tabular">{p.markupPercent}%</td>
                      <td className="p-3 text-right font-mono-tabular font-semibold text-stone-900">
                        <div className="inline-flex items-center gap-1">
                          {p.manualPriceLocked && <Lock className="w-3 h-3 text-orange-600" />}
                          <span>{formatBRL(p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono-tabular">
                        <span className={tot === 0 ? 'text-red-700 font-bold' : 'text-stone-700'}>
                          {p.stockOwn}/{p.stockSupplier}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => void saveProduct({ ...p, published: !p.published }, actorEmail)}
                          className={`font-semibold cursor-pointer ${
                            p.published ? 'text-emerald-800' : 'text-stone-400'
                          }`}
                        >
                          {p.published ? 'Publicado' : 'Oculto'}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="text-emerald-900 font-semibold hover:underline cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void saveProduct(
                              {
                                ...p,
                                id: undefined,
                                sku: `${p.sku}-CP`,
                                name: `${p.name} (Cópia)`,
                                slug: `${p.slug}-copia-${Date.now().toString().slice(-4)}`,
                                published: false,
                              },
                              actorEmail
                            ).then(() => setNotice('Produto duplicado como rascunho oculto.'))
                          }
                          title="Duplicar"
                          className="text-stone-600 hover:text-stone-900 cursor-pointer inline-flex align-middle"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteProduct(p.id).then(() => setNotice('Produto excluído.'))
                          }
                          title="Excluir"
                          className="text-red-700 hover:text-red-900 cursor-pointer inline-flex align-middle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Product Create/Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-stone-950/50 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveProduct}
              className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h2 className="text-lg font-extrabold text-stone-900">
                  {editing.id ? 'Editar produto' : 'Cadastrar novo produto'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-stone-700 block mb-1">Nome do produto</label>
                  <input
                    required
                    type="text"
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">SKU</label>
                  <input
                    required
                    type="text"
                    value={editing.sku || ''}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Código de barras (EAN/GTIN)</label>
                  <input
                    type="text"
                    value={editing.barcode || ''}
                    onChange={(e) => setEditing({ ...editing, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Categoria</label>
                  <select
                    value={editing.categoryId || ''}
                    onChange={(e) => {
                      const c = categories.find((x) => x.id === e.target.value);
                      setEditing({
                        ...editing,
                        categoryId: e.target.value,
                        categoryName: c?.name || e.target.value,
                      });
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={editing.brand || ''}
                    onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Origem do estoque</label>
                  <select
                    value={editing.sourceType || 'own_stock'}
                    onChange={(e) =>
                      setEditing({ ...editing, sourceType: e.target.value as ProductSourceType })
                    }
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                  >
                    <option value="own_stock">Estoque próprio</option>
                    <option value="dropshipping">Fornecedor / Dropshipping</option>
                    <option value="hybrid">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Fornecedor vinculado</label>
                  <select
                    value={editing.supplierId || ''}
                    onChange={(e) => setEditing({ ...editing, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                  >
                    <option value="">Nenhum (próprio)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Calculator */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">Motor de precificação automática</span>
                  <button
                    type="button"
                    onClick={() => {
                      const calc = calculateSalePrice({
                        costPrice: Number(editing.costPrice) || 0,
                        individualMarginPercent: Number(editing.markupPercent) || 0,
                        roundingMode: settings.roundingMode,
                      });
                      setEditing({ ...editing, price: calc.finalPrice });
                    }}
                    className="px-3 py-1 bg-emerald-900 text-white rounded-md font-semibold cursor-pointer"
                  >
                    Calcular preço pela margem
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-stone-600 block mb-1">Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editing.costPrice ?? 0}
                      onChange={(e) => setEditing({ ...editing, costPrice: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 border border-stone-200 rounded-lg bg-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">Margem (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editing.markupPercent ?? 50}
                      onChange={(e) => setEditing({ ...editing, markupPercent: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 border border-stone-200 rounded-lg bg-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">Preço venda (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min={0}
                      value={editing.price ?? 0}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 border border-stone-200 rounded-lg bg-white font-mono-tabular font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 block mb-1">Promocional (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={editing.promoPrice ?? 0}
                      onChange={(e) => setEditing({ ...editing, promoPrice: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 border border-stone-200 rounded-lg bg-white font-mono-tabular"
                    />
                  </div>
                </div>
                {profitPreview && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
                    <span className="text-stone-600">
                      Lucro líquido estimado (após taxa {settings.paymentFeePercent}%):{' '}
                      <strong className="font-mono-tabular text-emerald-800">
                        {formatBRL(profitPreview.estimatedProfit)} ({profitPreview.realMarginPercent}%)
                      </strong>
                    </span>
                    <label className="inline-flex items-center gap-1.5 font-semibold text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.manualPriceLocked)}
                        onChange={(e) => setEditing({ ...editing, manualPriceLocked: e.target.checked })}
                      />
                      {editing.manualPriceLocked ? <Lock className="w-3.5 h-3.5 text-orange-600" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Bloquear preço manual</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Stock & Dimensions */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Estoque próprio</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.stockOwn ?? 0}
                    onChange={(e) => setEditing({ ...editing, stockOwn: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Estoque fornec.</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.stockSupplier ?? 0}
                    onChange={(e) => setEditing({ ...editing, stockSupplier: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editing.weightKg ?? 0.5}
                    onChange={(e) => setEditing({ ...editing, weightKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    value={editing.heightCm ?? 10}
                    onChange={(e) => setEditing({ ...editing, heightCm: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Largura (cm)</label>
                  <input
                    type="number"
                    value={editing.widthCm ?? 15}
                    onChange={(e) => setEditing({ ...editing, widthCm: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Compr. (cm)</label>
                  <input
                    type="number"
                    value={editing.lengthCm ?? 20}
                    onChange={(e) => setEditing({ ...editing, lengthCm: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">URL da imagem principal</label>
                  <input
                    type="text"
                    value={editing.images?.[0] || ''}
                    onChange={(e) => setEditing({ ...editing, images: [e.target.value] })}
                    placeholder="/assets/products/..."
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={editing.description || ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="flex flex-wrap gap-5 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.published)}
                      onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                    />
                    <span>Publicado na vitrine</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.featured)}
                      onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    />
                    <span>Em destaque</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.bestSeller)}
                      onChange={(e) => setEditing({ ...editing, bestSeller: e.target.checked })}
                    />
                    <span>Mais vendido</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Salvar produto
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- SECTION 3: CATEGORIES ---
  if (section === 'categories') {
    const handleAddCat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!catName.trim()) return;
      const slug = slugify(catName);
      await saveCategory({
        id: slug,
        name: catName.trim(),
        slug,
        defaultMarginPercent: catMargin,
        imageUrl: catImg,
        active: true,
        sortOrder: categories.length + 1,
      });
      setCatName('');
      setNotice(`Categoria "${catName}" salva.`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-stone-900">Categorias e Margens</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncingCatalog}
              onClick={() => void handleSyncCatalogToDb()}
              className="px-4 py-2 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              {syncingCatalog ? 'Sincronizando...' : 'Sincronizar 10 categorias e 82 produtos'}
            </button>
            <button
              type="button"
              onClick={() =>
                void initializeDefaultCategoriesIfEmpty().then((n) =>
                  setNotice(n > 0 ? `${n} categorias padrão gravadas no Firestore.` : 'Categorias padrão já existem.')
                )
              }
              className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Inicializar categorias padrão
            </button>
          </div>
        </div>

        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

        <form onSubmit={handleAddCat} className="bg-white border border-stone-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Nome da categoria</label>
            <input
              required
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ex: Farmácia Pet"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Margem padrão (%)</label>
            <input
              type="number"
              value={catMargin}
              onChange={(e) => setCatMargin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Imagem (URL)</label>
            <input
              type="text"
              value={catImg}
              onChange={(e) => setCatImg(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
            Salvar categoria
          </button>
        </form>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Categoria</th>
                <th className="p-3">Slug</th>
                <th className="p-3 text-right">Margem padrão</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-semibold text-stone-900">{c.name}</td>
                  <td className="p-3 font-mono text-stone-500">/{c.slug}</td>
                  <td className="p-3 text-right font-mono-tabular">{c.defaultMarginPercent}%</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteCategory(c.id)}
                      className="text-red-700 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 4: SUPPLIERS ---
  if (section === 'suppliers') {
    const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supName.trim()) return;
      await saveSupplier({
        name: supName.trim(),
        connectorType: supType,
        apiUrl: supUrl.trim(),
        connectionStatus: supType === 'rest_api' && supUrl ? 'not_configured' : 'not_configured',
        syncFrequency: supFreq,
        defaultMarginPercent: supMargin,
        surchargePercent: supSurcharge,
        stockPolicy: 'Estoque do fornecedor isolado do estoque próprio',
        shippingPolicy: 'Envio direto mediante confirmação de pagamento',
      });
      setSupName('');
      setSupUrl('');
      setNotice('Fornecedor cadastrado como conector independente (status: não configurado até teste de conexão ou importação CSV).');
    };

    const handleTestConnection = async (sup: Supplier) => {
      setErrorMsg('');
      setNotice('');
      const headers = await getAuthHeaders();
      const res = await fetch('/api/suppliers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ apiUrl: sup.apiUrl, apiToken: supToken }),
      });
      const data = await res.json();
      await saveSupplier({
        ...sup,
        connectionStatus: data.ok ? 'connected' : 'error',
      });
      if (data.ok) setNotice(`${sup.name}: ${data.message}`);
      else setErrorMsg(`${sup.name}: ${data.error || data.message}`);
    };

    const handleSyncSupplier = async (sup: Supplier, updateStockOnly = false) => {
      setErrorMsg('');
      setNotice('');
      if (!sup.apiUrl) {
        setErrorMsg(`Fornecedor "${sup.name}" não possui URL de API REST configurada. Utilize a aba Importações para carregar catálogo via CSV/XML autorizado.`);
        return;
      }
      const headers = await getAuthHeaders();
      const res = await fetch('/api/suppliers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ connectorType: sup.connectorType, apiUrl: sup.apiUrl, apiToken: supToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao sincronizar catálogo do fornecedor.');
        return;
      }
      let imported = 0;
      let skippedLocked = 0;
      for (const raw of (data.items || []) as ParsedSupplierRow[]) {
        const existing = products.find((p) => p.sku === raw.externalSku && p.supplierId === sup.id);
        const canUpdatePrice = existing ? canAutoUpdatePrice(existing.manualPriceLocked) : true;
        if (!canUpdatePrice) skippedLocked++;
        const calc = calculateSalePrice({
          costPrice: raw.costPrice,
          generalMarginPercent: sup.defaultMarginPercent,
          supplierSurchargePercent: sup.surchargePercent,
          roundingMode: settings.roundingMode,
        });
        await saveProduct(
          {
            ...(existing || {}),
            sku: raw.externalSku,
            name: raw.name,
            brand: raw.brand,
            categoryId: slugify(raw.category || 'acessorios'),
            categoryName: raw.category || 'Acessórios',
            supplierId: sup.id,
            sourceType: 'dropshipping',
            costPrice: raw.costPrice,
            markupPercent: calc.effectiveMarkupPercent,
            price: updateStockOnly && existing ? existing.price : canUpdatePrice ? calc.finalPrice : existing!.price,
            stockOwn: existing?.stockOwn || 0,
            stockSupplier: raw.stockSupplier,
            available: (existing?.stockOwn || 0) + raw.stockSupplier > 0,
            published: existing ? existing.published : false,
          },
          actorEmail
        );
        imported++;
      }
      await saveSupplier({
        ...sup,
        connectionStatus: 'connected',
        lastSyncAt: new Date().toISOString(),
        importHistory: [
          {
            at: new Date().toISOString(),
            itemsImported: imported,
            itemsUpdated: imported,
            itemsSkippedLocked: skippedLocked,
            source: sup.connectorType,
            status: 'success',
          },
          ...(sup.importHistory || []),
        ],
      });
      setNotice(`Sincronização concluída: ${imported} item(ns) processado(s), ${skippedLocked} preço(s) manual(is) preservado(s).`);
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Fornecedores e Dropshipping Autorizado</h1>
          <p className="text-xs text-stone-500 mt-1">
            Conectores independentes para API REST, CSV ou XML autorizado. Nenhum fornecedor ou estoque é simulado.
          </p>
        </div>

        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

        <form onSubmit={handleAddSupplier} className="bg-white border border-stone-200 rounded-xl p-5 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-stone-900">Cadastrar conector de fornecedor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Nome do fornecedor</label>
              <input
                required
                type="text"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Ex: Distribuidora Pet Oficial"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Tipo de conector</label>
              <select
                value={supType}
                onChange={(e) => setSupType(e.target.value as Supplier['connectorType'])}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="csv">CSV Autorizado</option>
                <option value="xml">XML Autorizado</option>
                <option value="rest_api">API REST HTTPS</option>
                <option value="authorized_catalog">Catálogo Autorizado</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Frequência</label>
              <select
                value={supFreq}
                onChange={(e) => setSupFreq(e.target.value as Supplier['syncFrequency'])}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="manual">Manual</option>
                <option value="hourly">A cada hora</option>
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-stone-700 block mb-1">URL da API REST / Feed HTTPS (opcional para CSV)</label>
              <input
                type="url"
                value={supUrl}
                onChange={(e) => setSupUrl(e.target.value)}
                placeholder="https://api.fornecedor-autorizado.com.br/v1/catalog"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Token Bearer (memória da sessão)</label>
              <input
                type="password"
                value={supToken}
                onChange={(e) => setSupToken(e.target.value)}
                placeholder="Opcional (nunca gravado no Firestore)"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Margem padrão (%)</label>
              <input
                type="number"
                value={supMargin}
                onChange={(e) => setSupMargin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Acréscimo fornecedor (%)</label>
              <input
                type="number"
                value={supSurcharge}
                onChange={(e) => setSupSurcharge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
                Salvar fornecedor
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-xs text-stone-500">
              Nenhum fornecedor conectado ainda. Cadastre um fornecedor acima ou utilize a aba “Importações” para importar um arquivo CSV.
            </div>
          ) : (
            suppliers.map((sup) => (
              <div key={sup.id} className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                      <span>{sup.name}</span>
                      <span className="text-xs font-medium text-stone-500">
                        · Conector {sup.connectorType.toUpperCase()} · Status:{' '}
                        {sup.connectionStatus === 'connected'
                          ? 'Conectado'
                          : sup.connectionStatus === 'error'
                          ? 'Erro de conexão'
                          : 'Não configurado'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Margem padrão {sup.defaultMarginPercent}% · Acréscimo {sup.surchargePercent}% · Última sincronização:{' '}
                      {sup.lastSyncAt ? formatDateTimeBR(sup.lastSyncAt) : 'Nunca'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteSupplier(sup.id)}
                    className="text-xs text-red-700 hover:underline cursor-pointer"
                  >
                    Remover
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTestConnection(sup)}
                    className="px-3 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    TESTAR CONEXÃO
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSyncSupplier(sup, false)}
                    className="px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    IMPORTAR PRODUTOS AUTOMATICAMENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSyncSupplier(sup, false)}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>SINCRONIZAR CATÁLOGO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSyncSupplier(sup, true)}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    ATUALIZAR ESTOQUE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Trend Discovery based strictly on real internal catalog & review data */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Descoberta de produtos em alta (fontes verificadas)</h2>
          <p className="text-xs text-stone-600">
            Classificação calculada a partir dos itens reais cadastrados com maior demanda e margem registrada na loja. Nenhum produto é declarado viral sem evidência.
          </p>
          <div className="text-xs text-stone-500">
            Origem dos dados: Firestore PetClick (`products` + `orders`) · Atualizado em {formatDateTimeBR(new Date())}
          </div>
        </div>
      </div>
    );
  }

  // --- SECTION 5: IMPORTS (CSV / XML) ---
  if (section === 'imports') {
    const handleParse = () => {
      setErrorMsg('');
      const rows = importFormat === 'xml' ? parseSupplierXml(importText) : parseSupplierCsv(importText);
      if (rows.length === 0) {
        setErrorMsg('Nenhum produto válido encontrado no texto/arquivo informado.');
      }
      setParsedPreview(rows);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        setImportText(text);
        if (file.name.toLowerCase().endsWith('.xml')) setImportFormat('xml');
        else setImportFormat('csv');
      };
      reader.readAsText(file, 'utf-8');
    };

    const handleCommitImport = async () => {
      if (parsedPreview.length === 0) return;
      const sup = suppliers.find((s) => s.id === importSupplierId);
      let createdOrUpdated = 0;
      let skippedLocked = 0;

      for (const row of parsedPreview) {
        const existing = products.find((p) => p.sku === row.externalSku);
        const catSlug = slugify(row.category || 'acessorios');
        const catObj = categories.find((c) => c.slug === catSlug || c.id === catSlug);

        const calc = calculateSalePrice({
          costPrice: row.costPrice,
          generalMarginPercent: settings.defaultMarginPercent,
          categoryMarginPercent: catObj?.defaultMarginPercent,
          supplierSurchargePercent: sup?.surchargePercent || 0,
          roundingMode: importRounding,
        });

        const allowPriceUpdate = existing
          ? canAutoUpdatePrice(existing.manualPriceLocked, overrideLockedPrices)
          : true;
        if (existing && !allowPriceUpdate) skippedLocked++;

        const productId = await saveProduct(
          {
            ...(existing || {}),
            sku: row.externalSku,
            barcode: row.barcode || existing?.barcode,
            name: row.name,
            slug: existing?.slug || slugify(row.name),
            description: row.description,
            brand: row.brand,
            categoryId: catObj?.id || catSlug,
            categoryName: catObj?.name || row.category || 'Acessórios',
            supplierId: sup?.id || '',
            sourceType: sup ? 'dropshipping' : 'own_stock',
            costPrice: row.costPrice,
            markupPercent: calc.effectiveMarkupPercent,
            price: allowPriceUpdate ? calc.finalPrice : existing!.price,
            stockOwn: sup ? existing?.stockOwn || 0 : row.stockSupplier,
            stockSupplier: sup ? row.stockSupplier : existing?.stockSupplier || 0,
            available: row.stockSupplier > 0,
            published: existing ? existing.published : calc.finalPrice > 0 && row.stockSupplier > 0,
            weightKg: row.weightKg,
            heightCm: row.heightCm,
            widthCm: row.widthCm,
            lengthCm: row.lengthCm,
            images: row.imageUrl ? [row.imageUrl] : existing?.images || [PETCLICK_IMAGES.dogNutrition],
          },
          actorEmail
        );

        if (sup) {
          await saveSupplierProduct({
            id: `${sup.id}_${row.externalSku}`,
            supplierId: sup.id,
            externalSku: row.externalSku,
            linkedProductId: productId,
            name: row.name,
            supplierCost: row.costPrice,
            supplierStock: row.stockSupplier,
            sourceOrigin: importFormat.toUpperCase(),
            lastSyncedAt: new Date().toISOString(),
          });
        }
        createdOrUpdated++;
      }

      await writeAuditLog({
        actorUid,
        actorEmail,
        action: 'batch_import_products',
        module: 'imports',
        details: `Importados ${createdOrUpdated} itens via ${importFormat.toUpperCase()} (${skippedLocked} preços manuais protegidos).`,
      });

      setParsedPreview([]);
      setImportText('');
      setNotice(`Importação concluída: ${createdOrUpdated} produto(s) salvo(s), ${skippedLocked} preço(s) manual(is) preservado(s).`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">Importação em Lote (CSV / XML)</h1>
            <p className="text-xs text-stone-500">
              Importe catálogos autorizados aplicando automaticamente a fórmula de margem e proteção de preço manual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTextFile('modelo-fornecedor-petclick.csv', generateSupplierCsvTemplate())}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 bg-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar modelo CSV de fornecedor</span>
          </button>
        </div>

        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Fornecedor de origem</label>
              <select
                value={importSupplierId}
                onChange={(e) => setImportSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="">Estoque próprio (sem fornecedor)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (+{s.surchargePercent}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Formato</label>
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value as 'csv' | 'xml')}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="csv">CSV (; ou ,)</option>
                <option value="xml">XML de catálogo</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Arredondamento comercial</label>
              <select
                value={importRounding}
                onChange={(e) => setImportRounding(e.target.value as RoundingMode)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="cents_90">Terminar em ,90</option>
                <option value="cents_99">Terminar em ,99</option>
                <option value="nearest_int">Inteiro mais próximo</option>
                <option value="none">Exato (2 casas)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Selecionar arquivo CSV/XML</span>
              <input type="file" accept=".csv,.xml,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            <label className="inline-flex items-center gap-2 text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideLockedPrices}
                onChange={(e) => setOverrideLockedPrices(e.target.checked)}
              />
              <span>Autorizar sobrescrita de preços manuais bloqueados</span>
            </label>
          </div>

          <textarea
            rows={7}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Cole o conteúdo CSV ou XML aqui (ou carregue o arquivo acima)..."
            className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono text-[11px]"
          />

          <button
            type="button"
            onClick={handleParse}
            className="px-4 py-2 bg-stone-900 text-white font-semibold rounded-lg cursor-pointer"
          >
            Pré-visualizar e calcular preços
          </button>
        </div>

        {parsedPreview.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">
                Prévia da importação ({parsedPreview.length} itens)
              </h2>
              <button
                type="button"
                onClick={() => void handleCommitImport()}
                className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Confirmar e gravar no Firestore
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="p-2">SKU</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2 text-right">Custo</th>
                    <th className="p-2 text-right">Preço calculado</th>
                    <th className="p-2 text-right">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {parsedPreview.map((r, idx) => {
                    const calc = calculateSalePrice({
                      costPrice: r.costPrice,
                      generalMarginPercent: settings.defaultMarginPercent,
                      roundingMode: importRounding,
                    });
                    return (
                      <tr key={idx}>
                        <td className="p-2 font-mono">{r.externalSku}</td>
                        <td className="p-2 font-semibold">{r.name}</td>
                        <td className="p-2 text-right font-mono-tabular">{formatBRL(r.costPrice)}</td>
                        <td className="p-2 text-right font-mono-tabular font-bold text-emerald-900">
                          {formatBRL(calc.finalPrice)}
                        </td>
                        <td className="p-2 text-right font-mono-tabular">{r.stockSupplier}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SECTION 6: INVENTORY ---
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === adjProductId);
    if (!product || adjQty === 0) return;
    const signedDelta = ['out', 'reserve'].includes(adjType) ? -Math.abs(adjQty) : adjQty;
    await adjustProductStock({
      product,
      bucket: adjBucket,
      delta: signedDelta,
      type: adjType,
      reason: adjReason || 'Movimentação manual via ERP',
      actorUid,
    });
    setAdjReason('');
    setNotice(`Estoque de "${product.name}" atualizado e registrado no histórico.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">Controle de Estoque e Movimentações</h1>
        <p className="text-xs text-stone-500">
          Separação estrita entre estoque próprio, estoque do fornecedor (dropshipping) e reservas.
        </p>
      </div>

      {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

      <form onSubmit={handleStockAdjustment} className="bg-white border border-stone-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs">
        <div className="sm:col-span-2">
          <label className="font-semibold text-stone-700 block mb-1">Produto</label>
          <select
            required
            value={adjProductId}
            onChange={(e) => setAdjProductId(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
          >
            <option value="">Selecione...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Próprio: {p.stockOwn} | Forn: {p.stockSupplier})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Tipo</label>
          <select
            value={adjType}
            onChange={(e) => setAdjType(e.target.value as InventoryMovement['type'])}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
          >
            <option value="in">Entrada</option>
            <option value="out">Saída</option>
            <option value="return">Devolução</option>
            <option value="cancel">Cancelamento</option>
            <option value="manual_adjust">Ajuste manual</option>
          </select>
        </div>
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Carteira</label>
          <select
            value={adjBucket}
            onChange={(e) => setAdjBucket(e.target.value as 'own' | 'supplier')}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
          >
            <option value="own">Estoque próprio</option>
            <option value="supplier">Estoque fornecedor</option>
          </select>
        </div>
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Quantidade</label>
          <input
            type="number"
            value={adjQty}
            onChange={(e) => setAdjQty(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
          Registrar
        </button>
        <div className="sm:col-span-6">
          <input
            type="text"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Motivo da movimentação (nota fiscal, conferência, devolução...)"
            className="w-full px-3 py-2 border border-stone-200 rounded-lg"
          />
        </div>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <th className="p-3">Data</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Carteira</th>
              <th className="p-3 text-right">Variação</th>
              <th className="p-3">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-stone-500">
                  Nenhuma movimentação registrada ainda.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td className="p-3 font-mono text-stone-500">{formatDateTimeBR(m.createdAt)}</td>
                  <td className="p-3 font-semibold text-stone-900">{m.productName}</td>
                  <td className="p-3 uppercase">{m.type}</td>
                  <td className="p-3">{m.stockBucket === 'own' ? 'Próprio' : 'Fornecedor'}</td>
                  <td className={`p-3 text-right font-mono-tabular font-bold ${m.quantityDelta >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                  </td>
                  <td className="p-3 text-stone-600">{m.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
