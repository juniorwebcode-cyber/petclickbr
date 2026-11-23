import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Truck,
  Upload,
  Boxes,
  ShoppingCart,
  Users,
  Calculator,
  Wallet,
  LineChart,
  Receipt,
  Ticket,
  Percent,
  FileBarChart,
  CreditCard,
  Shield,
  Settings,
  ClipboardList,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { orderBy, limit } from 'firebase/firestore';
import { subscribeCollection, syncSeedCatalogToFirestore } from '../../lib/firestoreService';
import { CATALOG_SEED_PRODUCTS } from '../../lib/catalogSeed';
import { STOREFRONT_CATEGORIES_BLUEPRINT } from '../../lib/defaults';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import type {
  AuditLog,
  CashTransaction,
  Category,
  Coupon,
  Customer,
  Expense,
  InventoryMovement,
  Order,
  PaymentRecord,
  PosSession,
  Product,
  Promotion,
  Review,
  Sale,
  Supplier,
  UserProfile,
} from '../../types/petclick';
import { AdminLoginGate } from './AdminLoginGate';
import { AdminOverview } from './AdminOverview';
import { AdminCatalogModules } from './AdminCatalogModules';
import { AdminPosAndFinanceModules } from './AdminPosAndFinanceModules';
import { AdminGrowthAndSystemModules } from './AdminGrowthAndSystemModules';
import { BrandLogo } from '../../components/BrandLogo';

type AdminTabId =
  | 'overview'
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'imports'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'pos'
  | 'cash'
  | 'finance'
  | 'expenses'
  | 'coupons'
  | 'promotions'
  | 'reports'
  | 'shipping'
  | 'payments'
  | 'users'
  | 'settings'
  | 'audit';

const MENU_ITEMS: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'categories', label: 'Categorias', icon: FolderTree },
  { id: 'suppliers', label: 'Fornecedores', icon: Truck },
  { id: 'imports', label: 'Importações', icon: Upload },
  { id: 'inventory', label: 'Estoque', icon: Boxes },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'pos', label: 'PDV', icon: Calculator },
  { id: 'cash', label: 'Caixa', icon: Wallet },
  { id: 'finance', label: 'Financeiro', icon: LineChart },
  { id: 'expenses', label: 'Despesas', icon: Receipt },
  { id: 'coupons', label: 'Cupons', icon: Ticket },
  { id: 'promotions', label: 'Promoções', icon: Percent },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart },
  { id: 'shipping', label: 'Fretes', icon: Truck },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'users', label: 'Usuários', icon: Shield },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'audit', label: 'Auditoria', icon: ClipboardList },
];

const AdminWorkspaceInner: React.FC = () => {
  const { firebaseUser, isStaff, profile, serverAdmin, loginWithGoogle, logout } = useAuth();
  const { navigate, settings, shippingSettings } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoadedFromDb, setProductsLoadedFromDb] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoriesLoadedFromDb, setCategoriesLoadedFromDb] = useState(false);
  const [catalogSyncNotice, setCatalogSyncNotice] = useState('');
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [posSessions, setPosSessions] = useState<PosSession[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!firebaseUser || !isStaff) return;

    const unsubs = [
      subscribeCollection<Product>(
        'products',
        [],
        (rows) => {
          setAllProducts(
            [...rows].sort((a, b) => (a.sku || '').localeCompare(b.sku || '', 'pt-BR', { numeric: true }))
          );
          setProductsLoadedFromDb(true);
        },
        () => setProductsLoadedFromDb(true)
      ),
      subscribeCollection<Category>(
        'categories',
        [],
        (rows) => {
          setAllCategories([...rows].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
          setCategoriesLoadedFromDb(true);
        },
        () => setCategoriesLoadedFromDb(true)
      ),
      subscribeCollection<Supplier>('suppliers', [], setSuppliers, () => {}),
      subscribeCollection<InventoryMovement>('inventoryMovements', [orderBy('createdAt', 'desc'), limit(50)], setMovements, () => {}),
      subscribeCollection<Order>('orders', [orderBy('createdAt', 'desc'), limit(100)], setOrders, () => {}),
      subscribeCollection<Customer>('customers', [], setCustomers, () => {}),
      subscribeCollection<Sale>('sales', [orderBy('createdAt', 'desc'), limit(100)], setSales, () => {}),
      subscribeCollection<PosSession>('posSessions', [orderBy('openedAt', 'desc'), limit(30)], setPosSessions, () => {}),
      subscribeCollection<CashTransaction>('cashTransactions', [orderBy('createdAt', 'desc'), limit(80)], setCashTransactions, () => {}),
      subscribeCollection<Expense>('expenses', [orderBy('createdAt', 'desc')], setExpenses, () => {}),
      subscribeCollection<PaymentRecord>('payments', [orderBy('createdAt', 'desc')], setPayments, () => {}),
      subscribeCollection<Coupon>('coupons', [], setCoupons, () => {}),
      subscribeCollection<Promotion>('promotions', [], setPromotions, () => {}),
      subscribeCollection<Review>('reviews', [orderBy('createdAt', 'desc')], setReviews, () => {}),
      subscribeCollection<UserProfile>('users', [], setUsers, () => {}),
      subscribeCollection<AuditLog>('auditLogs', [orderBy('createdAt', 'desc'), limit(80)], setAuditLogs, () => {}),
    ];

    return () => unsubs.forEach((u) => u());
  }, [firebaseUser?.uid, isStaff]);

  useEffect(() => {
    if (!firebaseUser || !isStaff || !productsLoadedFromDb || !categoriesLoadedFromDb || autoSyncAttempted) return;
    if (allProducts.length >= CATALOG_SEED_PRODUCTS.length && allCategories.length >= STOREFRONT_CATEGORIES_BLUEPRINT.length) {
      setAutoSyncAttempted(true);
      return;
    }
    setAutoSyncAttempted(true);
    void syncSeedCatalogToFirestore(firebaseUser.uid, firebaseUser.email || 'admin')
      .then((res) => {
        setCatalogSyncNotice(
          `Catálogo gravado no Firestore: ${res.categoriesSaved} categorias, ${res.productsCreated} produtos criados e ${res.productsUpdated} atualizados.`
        );
      })
      .catch(() => {
        // Admin can also trigger manual sync in Produtos tab if needed
      });
  }, [firebaseUser, isStaff, productsLoadedFromDb, categoriesLoadedFromDb, allProducts.length, allCategories.length, autoSyncAttempted]);

  const effectiveProducts = allProducts.length > 0 ? allProducts : CATALOG_SEED_PRODUCTS;
  const effectiveCategories =
    allCategories.length > 0 ? allCategories : STOREFRONT_CATEGORIES_BLUEPRINT.map((c) => ({ ...c }));

  const activeLabel = MENU_ITEMS.find((m) => m.id === activeTab)?.label || 'Visão geral';

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-stone-200 flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 px-4 border-b border-emerald-900 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Ir para vitrine PetClick"
            className="flex items-center gap-2 cursor-pointer"
          >
            <BrandLogo variant="sidebar" />
            <span className="text-xs font-bold text-emerald-100 tracking-wide">ERP</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-stone-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-800 text-white font-semibold'
                    : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-900 space-y-2 text-xs">
          <div className="truncate text-emerald-200/80">
            {profile?.email || serverAdmin?.email || 'Administrador'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-emerald-900 hover:bg-emerald-800 rounded text-white cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Loja</span>
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-stone-800 hover:bg-stone-700 rounded text-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-stone-500">
              PetClick Admin / <strong className="text-stone-900">{activeLabel}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!firebaseUser && serverAdmin && (
              <button
                type="button"
                onClick={() => void loginWithGoogle()}
                className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
              >
                Conectar Google p/ gravar no Firestore
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              Abrir PDV
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {catalogSyncNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between gap-4">
              <span>{catalogSyncNotice}</span>
              <button
                type="button"
                onClick={() => setCatalogSyncNotice('')}
                className="text-emerald-800 font-semibold hover:underline cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <AdminOverview
              products={effectiveProducts}
              orders={orders}
              sales={sales}
              customers={customers}
              expenses={expenses}
              payments={payments}
              paymentFeePercent={settings.paymentFeePercent || 3.19}
            />
          )}

          {['products', 'categories', 'suppliers', 'imports', 'inventory'].includes(activeTab) && (
            <AdminCatalogModules
              section={activeTab as 'products' | 'categories' | 'suppliers' | 'imports' | 'inventory'}
              products={effectiveProducts}
              categories={effectiveCategories}
              suppliers={suppliers}
              movements={movements}
              settings={settings}
            />
          )}

          {['orders', 'customers', 'pos', 'cash', 'finance', 'expenses'].includes(activeTab) && (
            <AdminPosAndFinanceModules
              section={activeTab as 'orders' | 'customers' | 'pos' | 'cash' | 'finance' | 'expenses'}
              products={effectiveProducts}
              orders={orders}
              customers={customers}
              sales={sales}
              posSessions={posSessions}
              cashTransactions={cashTransactions}
              expenses={expenses}
              payments={payments}
              settings={settings}
            />
          )}

          {['coupons', 'promotions', 'reports', 'shipping', 'payments', 'users', 'settings', 'audit'].includes(
            activeTab
          ) && (
            <AdminGrowthAndSystemModules
              section={
                activeTab as
                  | 'coupons'
                  | 'promotions'
                  | 'reports'
                  | 'shipping'
                  | 'payments'
                  | 'users'
                  | 'settings'
                  | 'audit'
              }
              products={effectiveProducts}
              categories={effectiveCategories}
              suppliers={suppliers}
              customers={customers}
              orders={orders}
              sales={sales}
              posSessions={posSessions}
              expenses={expenses}
              payments={payments}
              coupons={coupons}
              promotions={promotions}
              reviews={reviews}
              users={users}
              auditLogs={auditLogs}
              settings={settings}
              shippingSettings={shippingSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => (
  <AdminLoginGate>
    <AdminWorkspaceInner />
  </AdminLoginGate>
);
