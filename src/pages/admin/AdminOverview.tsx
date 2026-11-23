import React from 'react';
import { formatBRL, parseFirestoreDate } from '../../lib/format';
import type { Customer, Expense, Order, PaymentRecord, Product, Sale } from '../../types/petclick';

interface AdminOverviewProps {
  products: Product[];
  orders: Order[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  payments: PaymentRecord[];
  paymentFeePercent: number;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  products,
  orders,
  sales,
  customers,
  expenses,
  payments,
  paymentFeePercent,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthPrefix = now.toISOString().slice(0, 7);

  const paidOrders = orders.filter((o) =>
    ['paid', 'preparing', 'shipped', 'delivered'].includes(o.status)
  );
  const pendingOrders = orders.filter((o) => o.status === 'pending_payment');
  const completedSales = sales.filter((s) => s.status === 'completed');

  const isSameDay = (raw: unknown) => {
    const d = parseFirestoreDate(raw);
    return d ? d.toISOString().slice(0, 10) === todayStr : false;
  };
  const isSameMonth = (raw: unknown) => {
    const d = parseFirestoreDate(raw);
    return d ? d.toISOString().slice(0, 7) === monthPrefix : false;
  };

  const todaySalesTotal =
    paidOrders.filter((o) => isSameDay(o.createdAt)).reduce((s, o) => s + o.total, 0) +
    completedSales.filter((s) => isSameDay(s.createdAt)).reduce((s, x) => s + x.total, 0);

  const monthSalesTotal =
    paidOrders.filter((o) => isSameMonth(o.createdAt)).reduce((s, o) => s + o.total, 0) +
    completedSales.filter((s) => isSameMonth(s.createdAt)).reduce((s, x) => s + x.total, 0);

  const grossRevenue =
    paidOrders.reduce((s, o) => s + o.total, 0) +
    completedSales.reduce((s, x) => s + x.total, 0);

  const cogsOrders = paidOrders.reduce(
    (s, o) => s + (o.items || []).reduce((acc, it) => acc + (it.unitCost || 0) * it.quantity, 0),
    0
  );
  const cogsSales = completedSales.reduce(
    (s, x) => s + (x.items || []).reduce((acc, it) => acc + (it.unitCost || 0) * it.quantity, 0),
    0
  );
  const totalProductCost = cogsOrders + cogsSales;

  const totalShippingCollected = paidOrders.reduce((s, o) => s + (o.shippingCost || 0), 0);
  const recordedFees = payments.reduce((s, p) => s + (p.feeCents || 0) / 100, 0);
  const estimatedFees =
    recordedFees > 0 ? recordedFees : Number(((grossRevenue * paymentFeePercent) / 100).toFixed(2));
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const estimatedNetProfit =
    grossRevenue - totalProductCost - estimatedFees - totalShippingCollected - totalExpenses;

  const totalTransactions = paidOrders.length + completedSales.length;
  const averageTicket = totalTransactions > 0 ? grossRevenue / totalTransactions : 0;

  const activeProducts = products.filter((p) => p.published && p.available);
  const outOfStockProducts = products.filter(
    (p) => (p.stockOwn || 0) + (p.stockSupplier || 0) <= 0
  );
  const lowStockProducts = products.filter((p) => {
    const total = (p.stockOwn || 0) + (p.stockSupplier || 0);
    return total > 0 && total <= (p.minStockAlert || 5);
  });

  // Top selling products aggregation
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  paidOrders.forEach((o) =>
    (o.items || []).forEach((it) => {
      const prev = productSalesMap.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
      prev.qty += it.quantity;
      prev.revenue += it.unitPrice * it.quantity;
      productSalesMap.set(it.productId, prev);
    })
  );
  completedSales.forEach((s) =>
    (s.items || []).forEach((it) => {
      const prev = productSalesMap.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
      prev.qty += it.quantity;
      prev.revenue += it.total;
      productSalesMap.set(it.productId, prev);
    })
  );
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const kpis = [
    { label: 'Vendas de hoje', value: formatBRL(todaySalesTotal) },
    { label: 'Vendas do mês', value: formatBRL(monthSalesTotal) },
    { label: 'Pedidos pendentes', value: String(pendingOrders.length) },
    { label: 'Pedidos pagos', value: String(paidOrders.length) },
    { label: 'Produtos ativos', value: String(activeProducts.length) },
    { label: 'Sem estoque', value: String(outOfStockProducts.length) },
    { label: 'Total de clientes', value: String(customers.length) },
    { label: 'Ticket médio', value: formatBRL(averageTicket) },
  ];

  const financialRows = [
    { label: 'Receita bruta (E-commerce + PDV)', value: grossRevenue, tone: 'text-stone-900' },
    { label: 'Custo dos produtos (CMV)', value: -totalProductCost, tone: 'text-stone-600' },
    { label: 'Taxas de pagamento', value: -estimatedFees, tone: 'text-stone-600' },
    { label: 'Fretes', value: -totalShippingCollected, tone: 'text-stone-600' },
    { label: 'Despesas operacionais', value: -totalExpenses, tone: 'text-stone-600' },
    {
      label: 'Lucro líquido estimado',
      value: estimatedNetProfit,
      tone: estimatedNetProfit >= 0 ? 'text-emerald-800 font-bold' : 'text-red-700 font-bold',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">Visão geral da operação</h1>
        <p className="text-xs text-stone-500 mt-1">
          Indicadores calculados exclusivamente com dados reais gravados no Cloud Firestore.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500">{k.label}</div>
            <div className="text-xl font-extrabold text-stone-900 font-mono-tabular mt-1">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial DRE Summary */}
        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-stone-900">Demonstrativo financeiro real</h2>
          <div className="divide-y divide-stone-100">
            {financialRows.map((row) => (
              <div key={row.label} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-stone-700">{row.label}</span>
                <span className={`font-mono-tabular ${row.tone}`}>{formatBRL(row.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-stone-900">Produtos mais vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-stone-500 py-6">
              Nenhuma venda paga ou concluída no PDV até o momento.
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((tp) => {
                const maxRev = topProducts[0]?.revenue || 1;
                const pct = Math.max(8, Math.round((tp.revenue / maxRev) * 100));
                return (
                  <div key={tp.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-stone-800 truncate max-w-[60%]">{tp.name}</span>
                      <span className="font-mono-tabular text-stone-600">
                        {tp.qty} un · {formatBRL(tp.revenue)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-800 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock & Out of Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-stone-900">Alertas de reposição de estoque</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...outOfStockProducts, ...lowStockProducts].slice(0, 9).map((p) => {
              const total = (p.stockOwn || 0) + (p.stockSupplier || 0);
              return (
                <div key={p.id} className="p-3 border border-stone-200 rounded-lg text-xs flex justify-between items-center">
                  <span className="font-medium text-stone-800 truncate pr-2">{p.name}</span>
                  <span
                    className={`font-mono-tabular font-bold shrink-0 ${
                      total === 0 ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {total === 0 ? 'Sem estoque' : `${total} un`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
