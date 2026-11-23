export type UserRole = 'customer' | 'admin' | 'manager' | 'cashier' | 'stockist';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refunded'
  | 'payment_failed';

export type ProductSourceType = 'own_stock' | 'dropshipping' | 'hybrid';

export type RoundingMode = 'none' | 'cents_90' | 'cents_99' | 'nearest_int';

export interface ProductVariant {
  id: string;
  label: string;
  sku?: string;
  barcode?: string;
  priceDelta: number;
  stockOwn: number;
  stockSupplier: number;
}

export interface PriceChangeEntry {
  at: string;
  previousPrice: number;
  newPrice: number;
  reason: string;
  actor: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  supplierId?: string;
  sourceType: ProductSourceType;
  costPrice: number;
  markupPercent: number;
  price: number;
  promoPrice?: number;
  manualPriceLocked: boolean;
  stockOwn: number;
  stockSupplier: number;
  stockReserved: number;
  minStockAlert: number;
  available: boolean;
  published: boolean;
  featured: boolean;
  bestSeller: boolean;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  images: string[];
  variants: ProductVariant[];
  priceHistory?: PriceChangeEntry[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  defaultMarginPercent: number;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SupplierConnectorType = 'rest_api' | 'csv' | 'xml' | 'authorized_catalog';
export type SupplierConnectionStatus = 'not_configured' | 'connected' | 'error' | 'disabled';

export interface SupplierImportHistoryEntry {
  at: string;
  itemsImported: number;
  itemsUpdated: number;
  itemsSkippedLocked: number;
  source: string;
  status: 'success' | 'error';
  message?: string;
}

export interface Supplier {
  id: string;
  name: string;
  apiUrl: string;
  connectorType: SupplierConnectorType;
  connectionStatus: SupplierConnectionStatus;
  syncFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  defaultMarginPercent: number;
  surchargePercent: number;
  stockPolicy: string;
  shippingPolicy: string;
  lastSyncAt?: string;
  importHistory?: SupplierImportHistoryEntry[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  externalSku: string;
  linkedProductId?: string;
  name: string;
  supplierCost: number;
  supplierStock: number;
  sourceOrigin: string;
  lastSyncedAt: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Customer {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  sourceType: ProductSourceType;
  maxAvailable: number;
}

export interface OrderItemRecord {
  id?: string;
  orderId: string;
  customerId: string;
  productId: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  createdAt?: unknown;
}

export interface Order {
  id: string;
  orderNsu: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  shippingAddress: CustomerAddress;
  shippingMethod: string;
  status: OrderStatus;
  paymentMethod?: string;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  shippingCost: number;
  total: number;
  checkoutUrl?: string;
  transactionNsu?: string;
  slug?: string;
  items: {
    productId: string;
    name: string;
    variantLabel?: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
  }[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryRecord {
  id: string;
  productId: string;
  stockOwn: number;
  stockSupplier: number;
  stockReserved: number;
  minStockAlert: number;
  updatedAt?: unknown;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'reserve' | 'cancel' | 'return' | 'manual_adjust' | 'supplier_sync';
  stockBucket: 'own' | 'supplier' | 'reserved';
  quantityDelta: number;
  reason: string;
  actorUid: string;
  createdAt?: unknown;
}

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  total: number;
}

export interface Sale {
  id: string;
  posSessionId: string;
  operatorUid: string;
  operatorName?: string;
  customerId?: string;
  customerName?: string;
  paymentMethod: 'cash' | 'pix' | 'card';
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  status: 'completed' | 'canceled' | 'returned';
  cancelReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PosSession {
  id: string;
  operatorUid: string;
  operatorName: string;
  status: 'open' | 'closed';
  openingBalance: number;
  cashTotal: number;
  pixTotal: number;
  cardTotal: number;
  withdrawals: number;
  reinforcements: number;
  countedClosingBalance?: number;
  cashDifference?: number;
  notes?: string;
  openedAt?: unknown;
  closedAt?: unknown;
}

export interface CashTransaction {
  id: string;
  posSessionId: string;
  type: 'in' | 'out' | 'sangria' | 'reforco';
  paymentMethod: 'cash' | 'pix' | 'card';
  amount: number;
  description: string;
  operatorUid: string;
  createdAt?: unknown;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  notes?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNsu: string;
  transactionNsu?: string;
  provider: 'infinitepay' | 'pdv_cash' | 'pdv_pix' | 'pdv_card';
  method: string;
  amountCents: number;
  feeCents: number;
  status: 'pending' | 'paid' | 'canceled' | 'refunded' | 'failed';
  verifiedByApi: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ShippingOption {
  id: string;
  label: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  source: 'correios_api' | 'correios_public' | 'store_rule' | 'pickup';
  requiresConfiguration?: boolean;
}

export interface ShippingQuoteRecord {
  id: string;
  originCep: string;
  destinationCep: string;
  method: string;
  price: number;
  estimatedDays: number;
  source: string;
  createdAt?: unknown;
}

export interface ShippingLabel {
  id: string;
  orderId: string;
  carrier: string;
  trackingCode: string;
  status: 'pending' | 'generated' | 'posted' | 'delivered';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountPercent: number;
  categoryId?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt?: unknown;
}

export interface StorefrontSettings {
  storeName: string;
  slogan: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroBannerUrl: string;
  whatsapp: string;
  email: string;
  address: string;
  instagramUrl?: string;
  facebookUrl?: string;
  businessHours: string;
  announcementText?: string;
  maintenanceMode: boolean;
  shippingPolicyText: string;
  privacyPolicyText: string;
  termsText: string;
  returnsPolicyText: string;
  seoTitle: string;
  seoDescription: string;
  footerText: string;
  defaultMarginPercent: number;
  roundingMode: RoundingMode;
  paymentFeePercent: number;
  updatedAt?: unknown;
}

export interface ShippingSettings {
  originCep: string;
  fixedShippingEnabled: boolean;
  fixedShippingPrice: number;
  fixedShippingDays: number;
  freeShippingEnabled: boolean;
  freeShippingMinOrder: number;
  pickupEnabled: boolean;
  pickupAddress: string;
  manualQuoteEnabled: boolean;
  manualQuoteNote: string;
  assuredInstallments?: number;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  mustChangePassword?: boolean;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminRecord {
  uid: string;
  email: string;
  role: Exclude<UserRole, 'customer'>;
  active: boolean;
  createdAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  module: string;
  details: string;
  createdAt?: unknown;
}

export interface ReportRecord {
  id: string;
  title: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  generatedBy: string;
  summaryJson?: string;
  createdAt?: unknown;
}

export interface IntegrationRecord {
  id: string;
  name: string;
  provider: string;
  status: 'configured' | 'not_configured' | 'error';
  handle?: string;
  updatedAt?: unknown;
}
