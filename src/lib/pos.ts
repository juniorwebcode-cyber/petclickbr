import type { CartItem, CashTransaction, Coupon, PosSession, Sale } from '../types/petclick';

export function calculateCouponDiscount(subtotal: number, coupon?: Coupon | null): number {
  if (!coupon || !coupon.active) return 0;
  if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) return 0;
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 0;

  if (coupon.discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    return Number(((subtotal * pct) / 100).toFixed(2));
  }
  return Number(Math.min(subtotal, Math.max(0, coupon.discountValue)).toFixed(2));
}

export function calculateCartTotals(
  items: CartItem[],
  shippingCost: number,
  coupon?: Coupon | null
): {
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  totalWeightKg: number;
} {
  const subtotal = Number(
    items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0).toFixed(2)
  );
  const discountTotal = calculateCouponDiscount(subtotal, coupon);
  const safeShipping = Math.max(0, Number(shippingCost) || 0);
  const total = Number(Math.max(0, subtotal - discountTotal + safeShipping).toFixed(2));
  const totalWeightKg = Number(
    items.reduce((acc, item) => acc + (item.weightKg || 0.3) * item.quantity, 0).toFixed(3)
  );

  return {
    subtotal,
    discountTotal,
    shippingCost: safeShipping,
    total,
    totalWeightKg,
  };
}

export function calculateChange(total: number, amountPaid: number, method: 'cash' | 'pix' | 'card'): number {
  if (method !== 'cash') return 0;
  return Number(Math.max(0, amountPaid - total).toFixed(2));
}

export function calculateCashSessionSummary(
  session: PosSession,
  sales: Sale[],
  transactions: CashTransaction[]
): {
  cashSales: number;
  pixSales: number;
  cardSales: number;
  reinforcements: number;
  withdrawals: number;
  expectedCashInDrawer: number;
} {
  const activeSales = sales.filter((s) => s.posSessionId === session.id && s.status === 'completed');
  const cashSales = Number(
    activeSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((acc, s) => acc + s.total, 0)
      .toFixed(2)
  );
  const pixSales = Number(
    activeSales
      .filter((s) => s.paymentMethod === 'pix')
      .reduce((acc, s) => acc + s.total, 0)
      .toFixed(2)
  );
  const cardSales = Number(
    activeSales
      .filter((s) => s.paymentMethod === 'card')
      .reduce((acc, s) => acc + s.total, 0)
      .toFixed(2)
  );

  const sessionTxs = transactions.filter((t) => t.posSessionId === session.id);
  const reinforcements = Number(
    sessionTxs
      .filter((t) => t.type === 'reforco' || t.type === 'in')
      .reduce((acc, t) => acc + t.amount, 0)
      .toFixed(2)
  );
  const withdrawals = Number(
    sessionTxs
      .filter((t) => t.type === 'sangria' || t.type === 'out')
      .reduce((acc, t) => acc + t.amount, 0)
      .toFixed(2)
  );

  const expectedCashInDrawer = Number(
    (session.openingBalance + cashSales + reinforcements - withdrawals).toFixed(2)
  );

  return {
    cashSales,
    pixSales,
    cardSales,
    reinforcements,
    withdrawals,
    expectedCashInDrawer,
  };
}
