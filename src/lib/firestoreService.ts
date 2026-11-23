import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CATALOG_SEED_PRODUCTS } from './catalogSeed';
import { sanitizeDocumentId } from './format';
import type {
  AdminRecord,
  AuditLog,
  CashTransaction,
  Category,
  Coupon,
  Customer,
  Expense,
  IntegrationRecord,
  InventoryMovement,
  InventoryRecord,
  Order,
  PaymentRecord,
  PosSession,
  Product,
  Promotion,
  ReportRecord,
  Review,
  Sale,
  ShippingLabel,
  ShippingQuoteRecord,
  ShippingSettings,
  StorefrontSettings,
  Supplier,
  SupplierProduct,
  UserProfile,
} from '../types/petclick';
import {
  DEFAULT_SHIPPING_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  STOREFRONT_CATEGORIES_BLUEPRINT,
} from './defaults';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// --- Generic Subscriptions ---
export function subscribeCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onData: (rows: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = collection(db, collectionName);
  const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T);
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

// --- Settings ---
export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  const path = 'settings/storefront';
  try {
    const snap = await getDoc(doc(db, 'settings', 'storefront'));
    if (!snap.exists()) return DEFAULT_STOREFRONT_SETTINGS;
    const raw = snap.data() as Partial<StorefrontSettings>;
    const merged: StorefrontSettings = { ...DEFAULT_STOREFRONT_SETTINGS, ...raw };
    if (!merged.storeName?.trim()) merged.storeName = DEFAULT_STOREFRONT_SETTINGS.storeName;
    if (!merged.slogan?.trim()) merged.slogan = DEFAULT_STOREFRONT_SETTINGS.slogan;
    if (!merged.logoUrl?.trim()) merged.logoUrl = DEFAULT_STOREFRONT_SETTINGS.logoUrl;
    if (!merged.heroBannerUrl?.trim()) merged.heroBannerUrl = DEFAULT_STOREFRONT_SETTINGS.heroBannerUrl;
    if (!merged.heroTitle?.trim()) merged.heroTitle = DEFAULT_STOREFRONT_SETTINGS.heroTitle;
    return merged;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveStorefrontSettings(data: Partial<StorefrontSettings>): Promise<void> {
  const path = 'settings/storefront';
  try {
    await setDoc(
      doc(db, 'settings', 'storefront'),
      stripUndefined({ ...DEFAULT_STOREFRONT_SETTINGS, ...data, updatedAt: serverTimestamp() }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const path = 'settings/shipping';
  try {
    const snap = await getDoc(doc(db, 'settings', 'shipping'));
    if (!snap.exists()) return DEFAULT_SHIPPING_SETTINGS;
    return { ...DEFAULT_SHIPPING_SETTINGS, ...(snap.data() as Partial<ShippingSettings>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveShippingSettings(data: Partial<ShippingSettings>): Promise<void> {
  const path = 'settings/shipping';
  try {
    await setDoc(
      doc(db, 'settings', 'shipping'),
      stripUndefined({ ...DEFAULT_SHIPPING_SETTINGS, ...data, updatedAt: serverTimestamp() }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- Categories ---
export async function initializeDefaultCategoriesIfEmpty(): Promise<number> {
  try {
    const existing = await getDocs(query(collection(db, 'categories'), where('active', '==', true), limit(1)));
    if (!existing.empty) return 0;
    const batch = writeBatch(db);
    for (const cat of STOREFRONT_CATEGORIES_BLUEPRINT) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return STOREFRONT_CATEGORIES_BLUEPRINT.length;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'categories');
  }
}

export async function saveCategory(category: Partial<Category> & { id: string; name: string; slug: string }): Promise<void> {
  const id = sanitizeDocumentId(category.id);
  const path = `categories/${id}`;
  try {
    const ref = doc(db, 'categories', id);
    const snap = await getDoc(ref);
    const payload = stripUndefined({
      id,
      name: category.name.slice(0, 80),
      slug: category.slug.slice(0, 100),
      description: (category.description || '').slice(0, 500),
      imageUrl: (category.imageUrl || '').slice(0, 1000),
      defaultMarginPercent: Number(category.defaultMarginPercent ?? 50),
      active: Boolean(category.active ?? true),
      sortOrder: Number(category.sortOrder ?? 10),
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(ref, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const safeId = sanitizeDocumentId(id);
  try {
    await deleteDoc(doc(db, 'categories', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${safeId}`);
  }
}

// --- Products ---
export async function saveProduct(
  product: Partial<Product> & { name: string; categoryId: string; price: number; costPrice: number },
  actorEmail = 'admin'
): Promise<string> {
  const id = sanitizeDocumentId(product.id || `${product.sku || 'pet'}_${Date.now()}`);
  const path = `products/${id}`;
  try {
    const ref = doc(db, 'products', id);
    const existingSnap = await getDoc(ref);
    const existingData = existingSnap.exists() ? (existingSnap.data() as Product) : null;

    const priceHistory = Array.isArray(existingData?.priceHistory) ? [...existingData.priceHistory] : [];
    if (existingData && existingData.price !== product.price) {
      priceHistory.unshift({
        at: new Date().toISOString(),
        previousPrice: existingData.price,
        newPrice: product.price,
        reason: product.manualPriceLocked ? 'Ajuste manual' : 'Atualização de tabela',
        actor: actorEmail,
      });
    }

    const totalStock = Math.max(0, Number(product.stockOwn ?? 0)) + Math.max(0, Number(product.stockSupplier ?? 0));
    const isValidToPublish = Number(product.price) > 0 && totalStock > 0 && Boolean(product.available ?? true);

    const payload = stripUndefined({
      id,
      sku: (product.sku || id).slice(0, 64),
      barcode: product.barcode ? product.barcode.slice(0, 64) : '',
      name: product.name.slice(0, 180),
      slug: (product.slug || id).slice(0, 200),
      description: (product.description || product.name).slice(0, 5000),
      brand: (product.brand || 'PetClick').slice(0, 100),
      categoryId: sanitizeDocumentId(product.categoryId),
      categoryName: (product.categoryName || product.categoryId).slice(0, 100),
      supplierId: product.supplierId ? sanitizeDocumentId(product.supplierId) : '',
      sourceType: product.sourceType || 'own_stock',
      costPrice: Math.max(0, Number(product.costPrice) || 0),
      markupPercent: Number(product.markupPercent ?? 50),
      price: Math.max(0, Number(product.price) || 0),
      promoPrice: product.promoPrice && product.promoPrice > 0 ? Number(product.promoPrice) : 0,
      manualPriceLocked: Boolean(product.manualPriceLocked ?? false),
      stockOwn: Math.max(0, Number(product.stockOwn ?? 0)),
      stockSupplier: Math.max(0, Number(product.stockSupplier ?? 0)),
      stockReserved: Math.max(0, Number(product.stockReserved ?? 0)),
      minStockAlert: Math.max(0, Number(product.minStockAlert ?? 5)),
      available: Boolean(product.available ?? totalStock > 0),
      published: Boolean(product.published) && isValidToPublish,
      featured: Boolean(product.featured ?? false),
      bestSeller: Boolean(product.bestSeller ?? false),
      weightKg: Math.max(0.05, Number(product.weightKg ?? 0.5)),
      heightCm: Math.max(1, Number(product.heightCm ?? 10)),
      widthCm: Math.max(1, Number(product.widthCm ?? 15)),
      lengthCm: Math.max(1, Number(product.lengthCm ?? 20)),
      images: (product.images || []).slice(0, 10),
      variants: (product.variants || []).slice(0, 30),
      priceHistory: priceHistory.slice(0, 20),
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(ref, payload);

    // Sync inventory summary doc
    await setDoc(doc(db, 'inventory', id), {
      productId: id,
      stockOwn: Number(payload.stockOwn),
      stockSupplier: Number(payload.stockSupplier),
      stockReserved: Number(payload.stockReserved),
      minStockAlert: Number(payload.minStockAlert),
      updatedAt: serverTimestamp(),
    });

    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const safeId = sanitizeDocumentId(id);
  try {
    await deleteDoc(doc(db, 'products', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${safeId}`);
  }
}

// --- Inventory Movements ---
export async function recordInventoryMovement(
  movement: Omit<InventoryMovement, 'id' | 'createdAt'>
): Promise<void> {
  const id = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await setDoc(doc(db, 'inventoryMovements', id), {
      ...movement,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `inventoryMovements/${id}`);
  }
}

export async function adjustProductStock(params: {
  product: Product;
  bucket: 'own' | 'supplier' | 'reserved';
  delta: number;
  type: InventoryMovement['type'];
  reason: string;
  actorUid: string;
}): Promise<void> {
  const { product, bucket, delta, type, reason, actorUid } = params;
  const safeId = sanitizeDocumentId(product.id);
  const nextOwn = bucket === 'own' ? Math.max(0, product.stockOwn + delta) : product.stockOwn;
  const nextSup = bucket === 'supplier' ? Math.max(0, product.stockSupplier + delta) : product.stockSupplier;
  const nextRes = bucket === 'reserved' ? Math.max(0, product.stockReserved + delta) : product.stockReserved;
  const available = nextOwn + nextSup > 0;

  try {
    await updateDoc(doc(db, 'products', safeId), {
      stockOwn: nextOwn,
      stockSupplier: nextSup,
      stockReserved: nextRes,
      available,
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'inventory', safeId), {
      productId: safeId,
      stockOwn: nextOwn,
      stockSupplier: nextSup,
      stockReserved: nextRes,
      minStockAlert: product.minStockAlert || 5,
      updatedAt: serverTimestamp(),
    });

    await recordInventoryMovement({
      productId: safeId,
      productName: product.name,
      type,
      stockBucket: bucket,
      quantityDelta: delta,
      reason,
      actorUid,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${safeId}`);
  }
}

// --- Suppliers ---
export async function saveSupplier(supplier: Partial<Supplier> & { name: string }): Promise<string> {
  const id = sanitizeDocumentId(supplier.id || `sup_${Date.now()}`);
  const path = `suppliers/${id}`;
  try {
    const ref = doc(db, 'suppliers', id);
    const snap = await getDoc(ref);
    await setDoc(
      ref,
      stripUndefined({
        id,
        name: supplier.name.slice(0, 120),
        apiUrl: (supplier.apiUrl || '').slice(0, 500),
        connectorType: supplier.connectorType || 'csv',
        connectionStatus: supplier.connectionStatus || 'not_configured',
        syncFrequency: supplier.syncFrequency || 'manual',
        defaultMarginPercent: Number(supplier.defaultMarginPercent ?? 50),
        surchargePercent: Number(supplier.surchargePercent ?? 0),
        stockPolicy: (supplier.stockPolicy || 'Separado do estoque próprio').slice(0, 500),
        shippingPolicy: (supplier.shippingPolicy || 'Envio direto do fornecedor').slice(0, 500),
        lastSyncAt: supplier.lastSyncAt || '',
        importHistory: (supplier.importHistory || []).slice(0, 25),
        createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  const safeId = sanitizeDocumentId(id);
  try {
    await deleteDoc(doc(db, 'suppliers', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `suppliers/${safeId}`);
  }
}

export async function saveSupplierProduct(sp: Omit<SupplierProduct, 'createdAt' | 'updatedAt'>): Promise<void> {
  const safeId = sanitizeDocumentId(sp.id);
  try {
    const ref = doc(db, 'supplierProducts', safeId);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      ...sp,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `supplierProducts/${safeId}`);
  }
}

// --- Orders & Order Items ---
export async function createPendingOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = sanitizeDocumentId(order.orderNsu);
  const path = `orders/${id}`;
  try {
    await setDoc(doc(db, 'orders', id), {
      ...order,
      status: 'pending_payment',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    order.items.forEach((item, idx) => {
      const itemId = sanitizeDocumentId(`${id}_item_${idx}`);
      batch.set(doc(db, 'orderItems', itemId), {
        orderId: id,
        customerId: order.customerId,
        productId: item.productId,
        productName: item.name,
        variantLabel: item.variantLabel || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        totalPrice: Number((item.unitPrice * item.quantity).toFixed(2)),
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateOrderStatus(
  orderId: string,
  updates: Partial<Pick<Order, 'status' | 'checkoutUrl' | 'transactionNsu' | 'slug' | 'paymentMethod'>>
): Promise<void> {
  const safeId = sanitizeDocumentId(orderId);
  try {
    await updateDoc(doc(db, 'orders', safeId), {
      ...stripUndefined(updates as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${safeId}`);
  }
}

// --- Customers ---
export async function saveCustomer(customer: Partial<Customer> & { name: string; email: string }): Promise<string> {
  const id = sanitizeDocumentId(customer.id || customer.uid || `cust_${Date.now()}`);
  const path = `customers/${id}`;
  try {
    const ref = doc(db, 'customers', id);
    const snap = await getDoc(ref);
    await setDoc(
      ref,
      stripUndefined({
        uid: customer.uid || '',
        name: customer.name.slice(0, 140),
        email: customer.email.slice(0, 180),
        phone: (customer.phone || '').slice(0, 30),
        cpf: (customer.cpf || '').slice(0, 20),
        cep: (customer.cep || '').slice(0, 15),
        street: (customer.street || '').slice(0, 200),
        number: (customer.number || '').slice(0, 30),
        complement: (customer.complement || '').slice(0, 100),
        neighborhood: (customer.neighborhood || '').slice(0, 100),
        city: (customer.city || '').slice(0, 100),
        state: (customer.state || '').slice(0, 10),
        createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- PDV & Cash Register ---
export async function openPosSession(params: {
  operatorUid: string;
  operatorName: string;
  openingBalance: number;
}): Promise<string> {
  const id = `pos_${Date.now()}`;
  try {
    await setDoc(doc(db, 'posSessions', id), {
      operatorUid: params.operatorUid,
      operatorName: params.operatorName,
      status: 'open',
      openingBalance: Number(params.openingBalance) || 0,
      cashTotal: 0,
      pixTotal: 0,
      cardTotal: 0,
      withdrawals: 0,
      reinforcements: 0,
      openedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posSessions/${id}`);
  }
}

export async function closePosSession(params: {
  sessionId: string;
  cashTotal: number;
  pixTotal: number;
  cardTotal: number;
  withdrawals: number;
  reinforcements: number;
  countedClosingBalance: number;
  cashDifference: number;
  notes?: string;
}): Promise<void> {
  const safeId = sanitizeDocumentId(params.sessionId);
  try {
    await updateDoc(doc(db, 'posSessions', safeId), {
      status: 'closed',
      cashTotal: params.cashTotal,
      pixTotal: params.pixTotal,
      cardTotal: params.cardTotal,
      withdrawals: params.withdrawals,
      reinforcements: params.reinforcements,
      countedClosingBalance: params.countedClosingBalance,
      cashDifference: params.cashDifference,
      notes: params.notes || '',
      closedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `posSessions/${safeId}`);
  }
}

export async function createCashTransaction(
  tx: Omit<CashTransaction, 'id' | 'createdAt'>
): Promise<string> {
  const id = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'cashTransactions', id), {
      ...tx,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `cashTransactions/${id}`);
  }
}

export async function createPosSale(sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `sale_${Date.now()}`;
  try {
    await setDoc(doc(db, 'sales', id), {
      ...sale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `sales/${id}`);
  }
}

export async function updatePosSaleStatus(
  saleId: string,
  status: 'canceled' | 'returned',
  cancelReason: string
): Promise<void> {
  const safeId = sanitizeDocumentId(saleId);
  try {
    await updateDoc(doc(db, 'sales', safeId), {
      status,
      cancelReason,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `sales/${safeId}`);
  }
}

// --- Expenses, Coupons, Promotions, Payments, Labels, Reports, Integrations, Audit ---
export async function saveExpense(expense: Partial<Expense> & { title: string; category: string; amount: number; createdBy: string }): Promise<string> {
  const id = sanitizeDocumentId(expense.id || `exp_${Date.now()}`);
  try {
    const ref = doc(db, 'expenses', id);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      title: expense.title.slice(0, 160),
      category: expense.category.slice(0, 80),
      amount: Number(expense.amount) || 0,
      dueDate: expense.dueDate || new Date().toISOString().slice(0, 10),
      paid: Boolean(expense.paid),
      notes: (expense.notes || '').slice(0, 500),
      createdBy: expense.createdBy,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `expenses/${id}`);
  }
}

export async function deleteExpense(id: string): Promise<void> {
  const safeId = sanitizeDocumentId(id);
  try {
    await deleteDoc(doc(db, 'expenses', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expenses/${safeId}`);
  }
}

export async function saveCoupon(coupon: Partial<Coupon> & { code: string; discountType: 'percent' | 'fixed'; discountValue: number }): Promise<string> {
  const id = sanitizeDocumentId(coupon.code.toUpperCase().trim());
  try {
    const ref = doc(db, 'coupons', id);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      code: id,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue) || 0,
      minOrderValue: Number(coupon.minOrderValue ?? 0),
      maxUses: Number(coupon.maxUses ?? 0),
      usedCount: Number(coupon.usedCount ?? 0),
      active: Boolean(coupon.active ?? true),
      expiresAt: coupon.expiresAt || '',
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `coupons/${id}`);
  }
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const safeCode = sanitizeDocumentId(code.toUpperCase().trim());
  if (!safeCode) return null;
  try {
    const snap = await getDoc(doc(db, 'coupons', safeCode));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Coupon, 'id'>) };
  } catch {
    return null;
  }
}

export async function savePromotion(promo: Partial<Promotion> & { title: string; discountPercent: number }): Promise<string> {
  const id = sanitizeDocumentId(promo.id || `promo_${Date.now()}`);
  try {
    const ref = doc(db, 'promotions', id);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      title: promo.title.slice(0, 140),
      description: (promo.description || '').slice(0, 500),
      discountPercent: Number(promo.discountPercent) || 0,
      categoryId: promo.categoryId || '',
      active: Boolean(promo.active ?? true),
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `promotions/${id}`);
  }
}

export async function submitReview(review: Omit<Review, 'id' | 'approved' | 'createdAt'>): Promise<void> {
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'reviews', id), {
      ...review,
      approved: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reviews/${id}`);
  }
}

export async function approveReview(reviewId: string, approved: boolean): Promise<void> {
  const safeId = sanitizeDocumentId(reviewId);
  try {
    await updateDoc(doc(db, 'reviews', safeId), { approved });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${safeId}`);
  }
}

export async function savePaymentRecord(payment: Omit<PaymentRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
  const safeId = sanitizeDocumentId(payment.id);
  try {
    const ref = doc(db, 'payments', safeId);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      ...payment,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payments/${safeId}`);
  }
}

export async function saveShippingQuote(quote: Omit<ShippingQuoteRecord, 'id' | 'createdAt'>): Promise<void> {
  const id = `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'shippingQuotes', id), {
      ...quote,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking audit quote write if anonymous
  }
}

export async function saveShippingLabel(label: Partial<ShippingLabel> & { orderId: string; carrier: string }): Promise<string> {
  const id = sanitizeDocumentId(label.id || `lbl_${label.orderId}`);
  try {
    const ref = doc(db, 'shippingLabels', id);
    const snap = await getDoc(ref);
    await setDoc(ref, {
      orderId: label.orderId,
      carrier: label.carrier,
      trackingCode: label.trackingCode || '',
      status: label.status || 'pending',
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `shippingLabels/${id}`);
  }
}

export async function saveIntegrationRecord(record: Omit<IntegrationRecord, 'updatedAt'>): Promise<void> {
  const safeId = sanitizeDocumentId(record.id);
  try {
    await setDoc(doc(db, 'integrations', safeId), {
      ...record,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `integrations/${safeId}`);
  }
}

export async function saveReportRecord(report: Omit<ReportRecord, 'id' | 'createdAt'>): Promise<string> {
  const id = `rep_${Date.now()}`;
  try {
    await setDoc(doc(db, 'reports', id), {
      ...report,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${id}`);
  }
}

export async function writeAuditLog(entry: {
  actorUid: string;
  actorEmail?: string;
  action: string;
  module: string;
  details: string;
}): Promise<void> {
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid: entry.actorUid,
      actorEmail: entry.actorEmail || '',
      action: entry.action.slice(0, 120),
      module: entry.module.slice(0, 80),
      details: entry.details.slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Avoid breaking primary mutation if audit write fails on client
  }
}

export async function saveAdminRecord(record: Omit<AdminRecord, 'createdAt'>): Promise<void> {
  const safeUid = sanitizeDocumentId(record.uid);
  try {
    await setDoc(doc(db, 'admins', safeUid), {
      ...record,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `admins/${safeUid}`);
  }
}

export async function updateUserRole(user: UserProfile): Promise<void> {
  const safeUid = sanitizeDocumentId(user.uid);
  try {
    await setDoc(
      doc(db, 'users', safeUid),
      {
        uid: safeUid,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        mustChangePassword: Boolean(user.mustChangePassword),
        createdAt: user.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    if (user.role !== 'customer') {
      await saveAdminRecord({
        uid: safeUid,
        email: user.email,
        role: user.role,
        active: user.active,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${safeUid}`);
  }
}

export function subscribePublishedProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): () => void {
  return subscribeCollection<Product>(
    'products',
    [where('published', '==', true)],
    (rows) =>
      onData(
        [...rows].sort((a, b) => (a.sku || '').localeCompare(b.sku || '', 'pt-BR', { numeric: true }))
      ),
    onError
  );
}

export function subscribeActiveCategories(
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
): () => void {
  return subscribeCollection<Category>(
    'categories',
    [where('active', '==', true)],
    (rows) => onData([...rows].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))),
    onError
  );
}

export async function syncSeedCatalogToFirestore(
  actorUid: string,
  actorEmail = 'admin'
): Promise<{ categoriesSaved: number; productsCreated: number; productsUpdated: number }> {
  try {
    // 1. Ensure all 10 categories exist in /categories
    const existingCatsSnap = await getDocs(collection(db, 'categories'));
    const existingCats = new Map<string, Record<string, unknown>>();
    existingCatsSnap.docs.forEach((d) => existingCats.set(d.id, d.data()));

    const catBatch = writeBatch(db);
    let categoriesSaved = 0;
    for (const cat of STOREFRONT_CATEGORIES_BLUEPRINT) {
      const prev = existingCats.get(cat.id);
      catBatch.set(doc(db, 'categories', cat.id), {
        ...cat,
        createdAt: prev?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      categoriesSaved++;
    }
    await catBatch.commit();

    // 2. Sync all 82 products + inventory docs in batches of 40 products (80 writes each, well below 500 limit)
    const existingProductsSnap = await getDocs(collection(db, 'products'));
    const existingProducts = new Map<string, Record<string, unknown>>();
    existingProductsSnap.docs.forEach((d) => existingProducts.set(d.id, d.data()));

    let productsCreated = 0;
    let productsUpdated = 0;
    const chunkSize = 40;

    for (let i = 0; i < CATALOG_SEED_PRODUCTS.length; i += chunkSize) {
      const slice = CATALOG_SEED_PRODUCTS.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const item of slice) {
        const prev = existingProducts.get(item.id);
        if (prev) productsUpdated++;
        else productsCreated++;

        batch.set(
          doc(db, 'products', item.id),
          stripUndefined({
            ...item,
            createdAt: prev?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );

        batch.set(doc(db, 'inventory', item.id), {
          productId: item.id,
          stockOwn: item.stockOwn,
          stockSupplier: item.stockSupplier,
          stockReserved: item.stockReserved,
          minStockAlert: item.minStockAlert,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    }

    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'sync_full_catalog',
      module: 'products',
      details: `Catálogo sincronizado: ${categoriesSaved} categorias, ${productsCreated} produtos criados e ${productsUpdated} atualizados.`,
    });

    return { categoriesSaved, productsCreated, productsUpdated };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}
