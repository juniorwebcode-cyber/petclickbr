import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Play } from 'lucide-react';
import { formatBRL, formatDateTimeBR, parseFirestoreDate } from '../../lib/format';
import { exportRowsToCsv } from '../../lib/csv';
import { exportReportPdf } from '../../lib/pdfExport';
import {
  approveReview,
  saveCoupon,
  savePromotion,
  saveReportRecord,
  saveShippingSettings,
  saveStorefrontSettings,
  updateUserRole,
  writeAuditLog,
} from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../../components/BrandLogo';
import type {
  AuditLog,
  Category,
  Coupon,
  Customer,
  Expense,
  Order,
  PaymentRecord,
  PosSession,
  Product,
  Promotion,
  Review,
  RoundingMode,
  Sale,
  ShippingSettings,
  StorefrontSettings,
  Supplier,
  UserProfile,
  UserRole,
} from '../../types/petclick';

interface GrowthSystemProps {
  section:
    | 'coupons'
    | 'promotions'
    | 'reports'
    | 'shipping'
    | 'payments'
    | 'users'
    | 'settings'
    | 'audit';
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  orders: Order[];
  sales: Sale[];
  posSessions: PosSession[];
  expenses: Expense[];
  payments: PaymentRecord[];
  coupons: Coupon[];
  promotions: Promotion[];
  reviews: Review[];
  users: UserProfile[];
  auditLogs: AuditLog[];
  settings: StorefrontSettings;
  shippingSettings: ShippingSettings;
}

export const AdminGrowthAndSystemModules: React.FC<GrowthSystemProps> = ({
  section,
  products,
  categories,
  suppliers,
  customers,
  orders,
  sales,
  posSessions,
  expenses,
  payments,
  coupons,
  promotions,
  reviews,
  users,
  auditLogs,
  settings,
  shippingSettings,
}) => {
  const { firebaseUser, getAuthHeaders } = useAuth();
  const { refreshSettings } = useStore();
  const actorUid = firebaseUser?.uid || 'admin_session';

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [healthInfo, setHealthInfo] = useState<{
    infinitePayConfigured?: boolean;
    infinitePayHandle?: string;
    correiosConfigured?: boolean;
  } | null>(null);

  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponValue, setCouponValue] = useState(10);
  const [couponMinOrder, setCouponMinOrder] = useState(0);

  // Promotion form
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoPct, setPromoPct] = useState(15);

  // Reports state
  const [reportType, setReportType] = useState<
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'annual'
    | 'by_product'
    | 'by_category'
    | 'by_supplier'
    | 'by_customer'
    | 'margin'
    | 'out_of_stock'
    | 'cancellations'
    | 'cash_closing'
    | 'financial_dre'
  >('financial_dre');
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().slice(0, 10));

  // Settings drafts
  const [storeDraft, setStoreDraft] = useState<StorefrontSettings>(settings);
  const [shipDraft, setShipDraft] = useState<ShippingSettings>(shippingSettings);

  useEffect(() => {
    setStoreDraft(settings);
  }, [settings]);

  useEffect(() => {
    setShipDraft(shippingSettings);
  }, [shippingSettings]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealthInfo(d.integrations || {}))
      .catch(() => {});
  }, []);

  // --- SECTION 13: COUPONS ---
  if (section === 'coupons') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Cupons de Desconto</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveCoupon({
              code: couponCode,
              discountType: couponType,
              discountValue: couponValue,
              minOrderValue: couponMinOrder,
              active: true,
            }).then(() => {
              setCouponCode('');
              setNotice('Cupom salvo com sucesso.');
            });
          }}
          className="bg-white border border-stone-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
        >
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Código</label>
            <input
              required
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="PET10"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono uppercase"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Tipo</label>
            <select
              value={couponType}
              onChange={(e) => setCouponType(e.target.value as 'percent' | 'fixed')}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Valor</label>
            <input
              type="number"
              step="0.01"
              value={couponValue}
              onChange={(e) => setCouponValue(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Pedido mínimo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={couponMinOrder}
              onChange={(e) => setCouponMinOrder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
            Criar cupom
          </button>
        </form>

        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Código</th>
                <th className="p-3">Desconto</th>
                <th className="p-3">Mínimo</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-mono font-bold">{c.code}</td>
                  <td className="p-3 font-mono-tabular">
                    {c.discountType === 'percent' ? `${c.discountValue}%` : formatBRL(c.discountValue)}
                  </td>
                  <td className="p-3 font-mono-tabular">{formatBRL(c.minOrderValue)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => void saveCoupon({ ...c, active: !c.active })}
                      className="text-emerald-900 font-semibold cursor-pointer"
                    >
                      {c.active ? 'Ativo' : 'Inativo'}
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

  // --- SECTION 14: PROMOTIONS ---
  if (section === 'promotions') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Campanhas e Promoções</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void savePromotion({
              title: promoTitle,
              description: promoDesc,
              discountPercent: promoPct,
              active: true,
            }).then(() => {
              setPromoTitle('');
              setPromoDesc('');
            });
          }}
          className="bg-white border border-stone-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
        >
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Título</label>
            <input
              required
              type="text"
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Descrição</label>
            <input
              type="text"
              value={promoDesc}
              onChange={(e) => setPromoDesc(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Desconto (%)</label>
            <input
              type="number"
              value={promoPct}
              onChange={(e) => setPromoPct(Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
            Salvar promoção
          </button>
        </form>

        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          {promotions.map((pr) => (
            <div key={pr.id} className="p-4 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-stone-900">{pr.title}</div>
                <div className="text-stone-500">{pr.description}</div>
              </div>
              <div className="font-mono-tabular font-bold text-orange-600">{pr.discountPercent}% OFF</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- SECTION 15: REPORTS (CSV & PDF EXPORT) ---
  if (section === 'reports') {
    const startMs = new Date(`${dateStart}T00:00:00`).getTime();
    const endMs = new Date(`${dateEnd}T23:59:59`).getTime();

    const inPeriod = (raw: unknown) => {
      const d = parseFirestoreDate(raw);
      if (!d) return true;
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    };

    const periodOrders = orders.filter((o) => inPeriod(o.createdAt));
    const periodSales = sales.filter((s) => inPeriod(s.createdAt));
    const paidPeriodOrders = periodOrders.filter((o) =>
      ['paid', 'preparing', 'shipped', 'delivered'].includes(o.status)
    );
    const completedPeriodSales = periodSales.filter((s) => s.status === 'completed');

    const reportData = (() => {
      if (reportType === 'by_product' || reportType === 'margin') {
        const rows = products.map((p) => {
          const eff = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price;
          const marginVal = eff - p.costPrice;
          const pct = eff > 0 ? ((marginVal / eff) * 100).toFixed(1) : '0';
          return [p.sku, p.name, formatBRL(p.costPrice), formatBRL(eff), `${pct}%`];
        });
        return {
          title: reportType === 'margin' ? 'Margem por Produto' : 'Catálogo e Desempenho por Produto',
          headers: ['SKU', 'Produto', 'Custo', 'Venda', 'Margem Real'],
          rows,
        };
      }
      if (reportType === 'out_of_stock') {
        const rows = products
          .filter((p) => (p.stockOwn || 0) + (p.stockSupplier || 0) <= 0)
          .map((p) => [p.sku, p.name, p.categoryName, p.stockOwn, p.stockSupplier]);
        return {
          title: 'Produtos Sem Estoque',
          headers: ['SKU', 'Produto', 'Categoria', 'Próprio', 'Fornecedor'],
          rows,
        };
      }
      if (reportType === 'by_category') {
        const rows = categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return [c.name, `${c.defaultMarginPercent}%`, count];
        });
        return {
          title: 'Relatório por Categoria',
          headers: ['Categoria', 'Margem Padrão', 'Qtd Produtos'],
          rows,
        };
      }
      if (reportType === 'by_supplier') {
        const rows = suppliers.map((s) => {
          const count = products.filter((p) => p.supplierId === s.id).length;
          return [s.name, s.connectorType.toUpperCase(), s.connectionStatus, count];
        });
        return {
          title: 'Desempenho de Fornecedores',
          headers: ['Fornecedor', 'Conector', 'Status', 'Produtos Vinculados'],
          rows,
        };
      }
      if (reportType === 'by_customer') {
        const rows = customers.map((c) => {
          const custOrders = periodOrders.filter((o) => o.customerId === c.uid || o.customerEmail === c.email);
          const sum = custOrders.reduce((acc, o) => acc + o.total, 0);
          return [c.name, c.email, custOrders.length, formatBRL(sum)];
        });
        return {
          title: 'Vendas por Cliente',
          headers: ['Cliente', 'E-mail', 'Pedidos', 'Total Comprado'],
          rows,
        };
      }
      if (reportType === 'cancellations') {
        const rows = [
          ...periodOrders
            .filter((o) => ['canceled', 'refunded'].includes(o.status))
            .map((o) => ['E-commerce', o.orderNsu, o.status, formatBRL(o.total)]),
          ...periodSales
            .filter((s) => ['canceled', 'returned'].includes(s.status))
            .map((s) => ['PDV', s.id, s.status, formatBRL(s.total)]),
        ];
        return {
          title: 'Cancelamentos e Devoluções',
          headers: ['Canal', 'Identificador', 'Status', 'Valor'],
          rows,
        };
      }
      if (reportType === 'cash_closing') {
        const rows = posSessions.map((s) => [
          s.id,
          s.operatorName,
          formatBRL(s.openingBalance),
          formatBRL(s.cashTotal + s.pixTotal + s.cardTotal),
          formatBRL(s.cashDifference || 0),
          s.status,
        ]);
        return {
          title: 'Fechamento de Caixa',
          headers: ['Sessão', 'Operador', 'Abertura', 'Vendas', 'Diferença', 'Status'],
          rows,
        };
      }

      // Default: Financial DRE & Period Sales
      const gross =
        paidPeriodOrders.reduce((s, o) => s + o.total, 0) +
        completedPeriodSales.reduce((s, x) => s + x.total, 0);
      const cost =
        paidPeriodOrders.reduce(
          (s, o) => s + (o.items || []).reduce((a, i) => a + (i.unitCost || 0) * i.quantity, 0),
          0
        ) +
        completedPeriodSales.reduce(
          (s, x) => s + (x.items || []).reduce((a, i) => a + (i.unitCost || 0) * i.quantity, 0),
          0
        );
      const ship = paidPeriodOrders.reduce((s, o) => s + (o.shippingCost || 0), 0);
      const fees = Number(((gross * (settings.paymentFeePercent || 3.19)) / 100).toFixed(2));
      const exp = expenses.reduce((s, e) => s + e.amount, 0);
      const profit = gross - cost - ship - fees - exp;

      return {
        title: 'Receita Bruta, Custos e Lucro Estimado',
        headers: ['Indicador Financeiro', 'Valor (BRL)'],
        rows: [
          ['Receita Bruta Total (E-commerce + PDV)', formatBRL(gross)],
          ['Custo dos Produtos Vendidos', formatBRL(cost)],
          ['Taxas de Pagamento Estimadas', formatBRL(fees)],
          ['Fretes do Período', formatBRL(ship)],
          ['Despesas Operacionais', formatBRL(exp)],
          ['Lucro Líquido Estimado', formatBRL(profit)],
        ],
      };
    })();

    const handleDownloadCsv = () => {
      const csv = exportRowsToCsv(reportData.headers, reportData.rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-petclick-${reportType}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      void saveReportRecord({
        title: reportData.title,
        reportType,
        periodStart: dateStart,
        periodEnd: dateEnd,
        generatedBy: actorUid,
      });
    };

    const handleDownloadPdf = () => {
      exportReportPdf({
        title: reportData.title,
        subtitle: `Período: ${dateStart} até ${dateEnd}`,
        headers: reportData.headers,
        rows: reportData.rows,
        filename: `relatorio-petclick-${reportType}.pdf`,
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-stone-900">Relatórios Gerenciais</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 bg-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Tipo de relatório</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
            >
              <option value="financial_dre">Receita Bruta x Lucro Estimado</option>
              <option value="daily">Vendas Diárias</option>
              <option value="weekly">Vendas Semanais</option>
              <option value="monthly">Vendas Mensais</option>
              <option value="annual">Vendas Anuais</option>
              <option value="by_product">Vendas / Catálogo por Produto</option>
              <option value="by_category">Por Categoria</option>
              <option value="by_supplier">Desempenho de Fornecedores</option>
              <option value="by_customer">Vendas por Cliente</option>
              <option value="margin">Margem por Produto</option>
              <option value="out_of_stock">Produtos Sem Estoque</option>
              <option value="cancellations">Cancelamentos e Devoluções</option>
              <option value="cash_closing">Fechamento de Caixa</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Data inicial</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Data final</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
            />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                {reportData.headers.map((h) => (
                  <th key={h} className="p-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length} className="p-8 text-center text-stone-500">
                    Sem registros para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, j) => (
                      <td key={j} className="p-3 font-mono-tabular">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 16: SHIPPING ---
  if (section === 'shipping') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Fretes e Correios</h1>
        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

        <div className="bg-white border border-stone-200 rounded-xl p-5 text-xs space-y-2">
          <div className="font-bold text-stone-900">Status da integração oficial Correios</div>
          <p className="text-stone-600">
            {healthInfo?.correiosConfigured
              ? 'Credenciais Correios detectadas no servidor. Cotações PAC/SEDEX ativas.'
              : 'Integração Correios NÃO configurada. Adicione CORREIOS_CLIENT_ID, CORREIOS_CLIENT_SECRET, CORREIOS_CONTRACT, CORREIOS_POSTING_CARD e CORREIOS_ORIGIN_CEP nas variáveis de ambiente do servidor.'}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveShippingSettings(shipDraft).then(async () => {
              await refreshSettings();
              setNotice('Regras de frete salvas.');
            });
          }}
          className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">CEP de origem</label>
              <input
                type="text"
                value={shipDraft.originCep}
                onChange={(e) => setShipDraft({ ...shipDraft, originCep: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Valor frete fixo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={shipDraft.fixedShippingPrice}
                onChange={(e) => setShipDraft({ ...shipDraft, fixedShippingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Mínimo para frete grátis (R$)</label>
              <input
                type="number"
                step="0.01"
                value={shipDraft.freeShippingMinOrder}
                onChange={(e) => setShipDraft({ ...shipDraft, freeShippingMinOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shipDraft.fixedShippingEnabled}
                onChange={(e) => setShipDraft({ ...shipDraft, fixedShippingEnabled: e.target.checked })}
              />
              <span>Ativar frete fixo</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shipDraft.freeShippingEnabled}
                onChange={(e) => setShipDraft({ ...shipDraft, freeShippingEnabled: e.target.checked })}
              />
              <span>Ativar frete grátis acima do mínimo</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shipDraft.pickupEnabled}
                onChange={(e) => setShipDraft({ ...shipDraft, pickupEnabled: e.target.checked })}
              />
              <span>Ativar retirada na loja</span>
            </label>
          </div>

          <button type="submit" className="px-5 py-2.5 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
            Salvar configurações de frete
          </button>
        </form>
      </div>
    );
  }

  // --- SECTION 17: PAYMENTS (INFINITEPAY) ---
  if (section === 'payments') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Pagamentos — InfinitePay Checkout Integrado</h1>
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-900 text-sm">Configuração Oficial InfinitePay</span>
            <span className="font-semibold text-emerald-800">
              {healthInfo?.infinitePayConfigured
                ? 'API Key + Checkout Público Ativos'
                : 'Checkout Público Integrado Ativo'}
            </span>
          </div>
          <p className="text-stone-600">
            Handle configurado (sem $): <strong className="font-mono">{healthInfo?.infinitePayHandle || 'raquel-petersen'}</strong>
          </p>
          <p className="text-stone-600">
            Endpoint público oficial: <code className="font-mono">POST https://api.infinitepay.io/invoices/public/checkout/links</code>
          </p>
          <p className="text-stone-600">
            Conferência antifraude obrigatória: <code className="font-mono">POST https://api.infinitepay.io/invoices/public/checkout/payment_check</code>
          </p>
          <p className="text-stone-600">
            Webhook receptor: <code className="font-mono">/api/webhook/infinitepay</code>
          </p>
        </div>
      </div>
    );
  }

  // --- SECTION 18: USERS & RBAC ---
  if (section === 'users') {
    const handleRevokeAll = async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/revoke-sessions', { method: 'POST', headers });
      const data = await res.json();
      setNotice(data.message || 'Sessões encerradas.');
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-stone-900">Usuários e Permissões (RBAC)</h1>
          <button
            type="button"
            onClick={() => void handleRevokeAll()}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Encerrar sessões administrativas
          </button>
        </div>
        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Função</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.uid}>
                  <td className="p-3 font-semibold text-stone-900">{u.name}</td>
                  <td className="p-3 text-stone-600">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        void updateUserRole({ ...u, role: e.target.value as UserRole }).then(() =>
                          setNotice(`Função de ${u.email} atualizada.`)
                        )
                      }
                      className="px-2 py-1 border border-stone-200 rounded bg-white"
                    >
                      <option value="customer">Cliente</option>
                      <option value="admin">Administrador</option>
                      <option value="manager">Gerente</option>
                      <option value="cashier">Operador de Caixa</option>
                      <option value="stockist">Estoquista</option>
                    </select>
                  </td>
                  <td className="p-3">{u.active ? 'Ativo' : 'Bloqueado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 19: SETTINGS ---
  if (section === 'settings') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Configurações Gerais da Loja</h1>
        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveStorefrontSettings(storeDraft).then(async () => {
              await writeAuditLog({
                actorUid,
                action: 'update_store_settings',
                module: 'settings',
                details: 'Configurações gerais da loja atualizadas.',
              });
              await refreshSettings();
              setNotice('Configurações da loja atualizadas.');
            });
          }}
          className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Nome da loja</label>
              <input
                type="text"
                value={storeDraft.storeName}
                onChange={(e) => setStoreDraft({ ...storeDraft, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Slogan</label>
              <input
                type="text"
                value={storeDraft.slogan}
                onChange={(e) => setStoreDraft({ ...storeDraft, slogan: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="bg-white border border-stone-200 rounded-xl p-2.5 flex items-center justify-center shrink-0">
                <BrandLogo variant="preview" customSrc={storeDraft.logoUrl} />
              </div>
              <div className="flex-1">
                <label className="font-semibold text-stone-700 block mb-1">URL / Caminho da Logo Oficial</label>
                <input
                  type="text"
                  value={storeDraft.logoUrl || ''}
                  onChange={(e) => setStoreDraft({ ...storeDraft, logoUrl: e.target.value })}
                  placeholder="/assets/images/logo-petclick.png"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Exibida automaticamente no cabeçalho, rodapé, telas de login e painel administrativo.
                </p>
              </div>
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">WhatsApp (com DDI/DDD)</label>
              <input
                type="text"
                value={storeDraft.whatsapp}
                onChange={(e) => setStoreDraft({ ...storeDraft, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">E-mail de contato</label>
              <input
                type="email"
                value={storeDraft.email}
                onChange={(e) => setStoreDraft({ ...storeDraft, email: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-stone-700 block mb-1">Endereço físico</label>
              <input
                type="text"
                value={storeDraft.address}
                onChange={(e) => setStoreDraft({ ...storeDraft, address: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-stone-700 block mb-1">Aviso topo da vitrine</label>
              <input
                type="text"
                value={storeDraft.announcementText || ''}
                onChange={(e) => setStoreDraft({ ...storeDraft, announcementText: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Margem padrão global (%)</label>
              <input
                type="number"
                value={storeDraft.defaultMarginPercent}
                onChange={(e) => setStoreDraft({ ...storeDraft, defaultMarginPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Arredondamento comercial</label>
              <select
                value={storeDraft.roundingMode}
                onChange={(e) => setStoreDraft({ ...storeDraft, roundingMode: e.target.value as RoundingMode })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-white"
              >
                <option value="cents_90">Terminar em ,90</option>
                <option value="cents_99">Terminar em ,99</option>
                <option value="nearest_int">Inteiro mais próximo</option>
                <option value="none">Sem arredondamento</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
            <input
              type="checkbox"
              checked={storeDraft.maintenanceMode}
              onChange={(e) => setStoreDraft({ ...storeDraft, maintenanceMode: e.target.checked })}
            />
            <span>Ativar modo manutenção na vitrine pública</span>
          </label>

          <div>
            <button type="submit" className="px-6 py-2.5 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
              Salvar todas as configurações
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- SECTION 20: AUDIT LOGS & AUTOMATIONS ---
  const handleRunAutomations = async () => {
    setErrorMsg('');
    const headers = await getAuthHeaders();
    const res = await fetch('/api/automations/run', { method: 'POST', headers });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Erro ao executar automações.');
      return;
    }
    setNotice(
      `Rotina executada: ${data.summary.lowStockProducts} alerta(s) de estoque baixo, ${data.summary.pendingOrdersChecked} pedido(s) pendente(s) verificado(s).`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-stone-900">Auditoria, Moderação e Automações</h1>
        <button
          type="button"
          onClick={() => void handleRunAutomations()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Executar verificação programada agora</span>
        </button>
      </div>
      {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
      {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

      {/* Review Moderation */}
      {reviews.filter((r) => !r.approved).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Avaliações aguardando aprovação</h2>
          {reviews
            .filter((r) => !r.approved)
            .map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 text-xs border-b border-stone-100 pb-2">
                <div>
                  <strong>{r.customerName}</strong> ({r.rating}★): {r.comment}
                </div>
                <button
                  type="button"
                  onClick={() => void approveReview(r.id, true)}
                  className="px-3 py-1 bg-emerald-900 text-white rounded font-semibold cursor-pointer"
                >
                  Aprovar
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <th className="p-3">Data</th>
              <th className="p-3">Módulo</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="p-3 font-mono text-stone-500">{formatDateTimeBR(log.createdAt)}</td>
                <td className="p-3 uppercase font-semibold">{log.module}</td>
                <td className="p-3 font-mono">{log.action}</td>
                <td className="p-3 text-stone-700">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
