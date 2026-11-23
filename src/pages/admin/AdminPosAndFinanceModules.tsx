import React, { useMemo, useState } from 'react';
import { Printer, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { formatBRL, formatDateTimeBR } from '../../lib/format';
import { calculateCashSessionSummary, calculateChange } from '../../lib/pos';
import { exportPosReceiptPdf } from '../../lib/pdfExport';
import {
  adjustProductStock,
  closePosSession,
  createCashTransaction,
  createPosSale,
  deleteExpense,
  openPosSession,
  saveCustomer,
  saveExpense,
  savePaymentRecord,
  saveShippingLabel,
  updateOrderStatus,
  updatePosSaleStatus,
  writeAuditLog,
} from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type {
  CashTransaction,
  Customer,
  Expense,
  Order,
  OrderStatus,
  PaymentRecord,
  PosSession,
  Product,
  Sale,
  SaleItem,
  StorefrontSettings,
} from '../../types/petclick';

interface PosFinanceProps {
  section: 'orders' | 'customers' | 'pos' | 'cash' | 'finance' | 'expenses';
  products: Product[];
  orders: Order[];
  customers: Customer[];
  sales: Sale[];
  posSessions: PosSession[];
  cashTransactions: CashTransaction[];
  expenses: Expense[];
  payments: PaymentRecord[];
  settings: StorefrontSettings;
}

export const AdminPosAndFinanceModules: React.FC<PosFinanceProps> = ({
  section,
  products,
  orders,
  customers,
  sales,
  posSessions,
  cashTransactions,
  expenses,
  payments,
  settings,
}) => {
  const { firebaseUser, profile } = useAuth();
  const actorUid = firebaseUser?.uid || 'admin_session';
  const operatorName = profile?.name || firebaseUser?.displayName || 'Operador PetClick';

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- PDV State ---
  const [pdvSearch, setPdvSearch] = useState('');
  const [pdvCart, setPdvCart] = useState<SaleItem[]>([]);
  const [pdvDiscount, setPdvDiscount] = useState(0);
  const [pdvCustomerId, setPdvCustomerId] = useState('');
  const [pdvQuickCustName, setPdvQuickCustName] = useState('');
  const [pdvQuickCustEmail, setPdvQuickCustEmail] = useState('');
  const [pdvMethod, setPdvMethod] = useState<'cash' | 'pix' | 'card'>('pix');
  const [pdvAmountPaid, setPdvAmountPaid] = useState(0);
  const [pdvPaymentConfirmed, setPdvPaymentConfirmed] = useState(true);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<Sale | null>(null);

  // --- Cash Register State ---
  const [openingBalance, setOpeningBalance] = useState(150);
  const [txType, setTxType] = useState<'sangria' | 'reforco'>('sangria');
  const [txAmount, setTxAmount] = useState(0);
  const [txDesc, setTxDesc] = useState('');
  const [countedCash, setCountedCash] = useState(0);

  // --- Expense Form ---
  const [expTitle, setExpTitle] = useState('');
  const [expCat, setExpCat] = useState('Operacional');
  const [expAmount, setExpAmount] = useState(0);
  const [expDue, setExpDue] = useState(new Date().toISOString().slice(0, 10));
  const [expPaid, setExpPaid] = useState(true);

  const openSession = posSessions.find((s) => s.status === 'open');

  // --- SECTION 7: ORDERS ---
  if (section === 'orders') {
    const handleVerifyInfinitePay = async (order: Order) => {
      setErrorMsg('');
      setNotice('');
      const res = await fetch('/api/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNsu: order.orderNsu,
          transactionNsu: order.transactionNsu,
          slug: order.slug,
        }),
      });
      const data = await res.json();
      if (data.paid === true) {
        await updateOrderStatus(order.id, {
          status: 'paid',
          paymentMethod: String(data.capture_method || 'PIX').toUpperCase(),
          transactionNsu: data.transaction_nsu || order.transactionNsu,
        });
        await savePaymentRecord({
          id: `pay_${order.orderNsu}`,
          orderId: order.id,
          orderNsu: order.orderNsu,
          transactionNsu: data.transaction_nsu || order.transactionNsu,
          provider: 'infinitepay',
          method: String(data.capture_method || 'PIX').toUpperCase(),
          amountCents: Number(data.amount || Math.round(order.total * 100)),
          feeCents: 0,
          status: 'paid',
          verifiedByApi: true,
        });
        setNotice(`Pedido #${order.orderNsu} confirmado como PAGO pela API oficial InfinitePay.`);
      } else {
        setErrorMsg(`Pedido #${order.orderNsu}: ${data.error || data.message || 'Pagamento ainda não compensado.'}`);
      }
    };

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Pedidos E-commerce ({orders.length})</h1>
        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Pedido / Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Frete</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    Nenhum pedido registrado ainda.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="p-3">
                      <div className="font-mono font-bold text-stone-900">#{ord.orderNsu}</div>
                      <div className="text-[11px] text-stone-500">{formatDateTimeBR(ord.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-stone-900">{ord.customerName}</div>
                      <div className="text-[11px] text-stone-500">{ord.customerEmail}</div>
                    </td>
                    <td className="p-3 text-stone-600">
                      {ord.shippingMethod} ({formatBRL(ord.shippingCost)})
                    </td>
                    <td className="p-3 text-right font-mono-tabular font-bold text-stone-900">
                      {formatBRL(ord.total)}
                    </td>
                    <td className="p-3">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          void updateOrderStatus(ord.id, { status: e.target.value as OrderStatus })
                        }
                        className="px-2 py-1 border border-stone-200 rounded bg-white text-xs font-semibold"
                      >
                        <option value="pending_payment">Aguardando pagamento</option>
                        <option value="paid">Pago</option>
                        <option value="preparing">Em preparação</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregue</option>
                        <option value="canceled">Cancelado</option>
                        <option value="refunded">Reembolsado</option>
                      </select>
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleVerifyInfinitePay(ord)}
                        className="px-2.5 py-1 bg-stone-900 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Conferir InfinitePay
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void saveShippingLabel({
                            orderId: ord.id,
                            carrier: ord.shippingMethod,
                            trackingCode: `BR${Date.now().toString().slice(-8)}`,
                            status: 'generated',
                          }).then(() => setNotice(`Etiqueta de envio criada para pedido #${ord.orderNsu}.`))
                        }
                        className="px-2.5 py-1 border border-stone-300 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Etiqueta
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 8: CUSTOMERS ---
  if (section === 'customers') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Clientes ({customers.length})</h1>
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Nome</th>
                <th className="p-3">E-mail / Telefone</th>
                <th className="p-3">Cidade / UF</th>
                <th className="p-3 text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500">
                    Nenhum cliente cadastrado até o momento.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const count = orders.filter((o) => o.customerId === c.uid || o.customerEmail === c.email).length;
                  return (
                    <tr key={c.id}>
                      <td className="p-3 font-semibold text-stone-900">{c.name}</td>
                      <td className="p-3 text-stone-600">
                        {c.email} · {c.phone || '—'}
                      </td>
                      <td className="p-3 text-stone-600">
                        {c.city ? `${c.city}/${c.state}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono-tabular">{count}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 9: PDV (POINT OF SALE) ---
  if (section === 'pos') {
    const pdvResults = products
      .filter((p) => {
        const q = pdvSearch.trim().toLowerCase();
        if (!q) return p.stockOwn > 0;
        return `${p.name} ${p.sku} ${p.barcode || ''}`.toLowerCase().includes(q);
      })
      .slice(0, 10);

    const addPdvItem = (p: Product) => {
      if (p.stockOwn <= 0) {
        setErrorMsg(`Produto "${p.name}" sem estoque próprio disponível no balcão.`);
        return;
      }
      setErrorMsg('');
      const unitPrice = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price;
      setPdvCart((prev) => {
        const idx = prev.findIndex((i) => i.productId === p.id);
        if (idx >= 0) {
          const next = [...prev];
          const nextQty = Math.min(p.stockOwn, next[idx].quantity + 1);
          next[idx] = { ...next[idx], quantity: nextQty, total: Number((nextQty * unitPrice).toFixed(2)) };
          return next;
        }
        return [
          ...prev,
          {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            quantity: 1,
            unitPrice,
            unitCost: p.costPrice,
            total: unitPrice,
          },
        ];
      });
    };

    const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = pdvSearch.trim().toLowerCase();
      const exact = products.find(
        (p) => (p.barcode && p.barcode.toLowerCase() === q) || p.sku.toLowerCase() === q
      );
      if (exact) {
        addPdvItem(exact);
        setPdvSearch('');
      }
    };

    const pdvSubtotal = Number(pdvCart.reduce((s, i) => s + i.total, 0).toFixed(2));
    const pdvTotal = Number(Math.max(0, pdvSubtotal - Math.max(0, pdvDiscount)).toFixed(2));
    const pdvChange = calculateChange(pdvTotal, pdvAmountPaid, pdvMethod);

    const handleFinalizeSale = async () => {
      setErrorMsg('');
      setNotice('');
      if (!openSession) {
        setErrorMsg('Abra um turno de caixa no módulo "Caixa" antes de registrar vendas no PDV.');
        return;
      }
      if (pdvCart.length === 0) {
        setErrorMsg('Adicione itens ao carrinho do PDV.');
        return;
      }
      if (!pdvPaymentConfirmed) {
        setErrorMsg('Confirme o recebimento real (dinheiro, Pix ou maquininha) antes de finalizar a venda.');
        return;
      }
      if (pdvMethod === 'cash' && pdvAmountPaid < pdvTotal) {
        setErrorMsg('Valor recebido em dinheiro menor que o total da venda.');
        return;
      }

      let customerName = customers.find((c) => c.id === pdvCustomerId)?.name || 'Consumidor Balcão';
      let customerId = pdvCustomerId;
      if (!customerId && pdvQuickCustName.trim()) {
        customerId = await saveCustomer({
          name: pdvQuickCustName.trim(),
          email: pdvQuickCustEmail.trim() || `balcao_${Date.now()}@petclick.local`,
        });
        customerName = pdvQuickCustName.trim();
      }

      const paidAmount = pdvMethod === 'cash' ? pdvAmountPaid : pdvTotal;
      const saleId = await createPosSale({
        posSessionId: openSession.id,
        operatorUid: actorUid,
        operatorName,
        customerId,
        customerName,
        paymentMethod: pdvMethod,
        items: pdvCart,
        subtotal: pdvSubtotal,
        discount: pdvDiscount,
        total: pdvTotal,
        amountPaid: paidAmount,
        changeGiven: pdvChange,
        status: 'completed',
      });

      for (const item of pdvCart) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          await adjustProductStock({
            product: prod,
            bucket: 'own',
            delta: -item.quantity,
            type: 'out',
            reason: `Venda PDV #${saleId}`,
            actorUid,
          });
        }
      }

      await createCashTransaction({
        posSessionId: openSession.id,
        type: 'in',
        paymentMethod: pdvMethod,
        amount: pdvTotal,
        description: `Venda PDV #${saleId} (${customerName})`,
        operatorUid: actorUid,
      });

      await savePaymentRecord({
        id: `pay_${saleId}`,
        orderId: saleId,
        orderNsu: saleId,
        provider: pdvMethod === 'cash' ? 'pdv_cash' : pdvMethod === 'pix' ? 'pdv_pix' : 'pdv_card',
        method: pdvMethod.toUpperCase(),
        amountCents: Math.round(pdvTotal * 100),
        feeCents: 0,
        status: 'paid',
        verifiedByApi: true,
      });

      const createdSale: Sale = {
        id: saleId,
        posSessionId: openSession.id,
        operatorUid: actorUid,
        operatorName,
        customerId,
        customerName,
        paymentMethod: pdvMethod,
        items: pdvCart,
        subtotal: pdvSubtotal,
        discount: pdvDiscount,
        total: pdvTotal,
        amountPaid: paidAmount,
        changeGiven: pdvChange,
        status: 'completed',
        createdAt: new Date(),
      };

      setLastSaleReceipt(createdSale);
      setPdvCart([]);
      setPdvDiscount(0);
      setPdvAmountPaid(0);
      setPdvQuickCustName('');
      setPdvQuickCustEmail('');
      setNotice(`Venda #${saleId} finalizada com sucesso!`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900">PDV — Frente de Caixa</h1>
            <p className="text-xs text-stone-500">
              {openSession
                ? `Caixa aberto por ${openSession.operatorName} (Saldo inicial ${formatBRL(openSession.openingBalance)})`
                : 'Atenção: Caixa fechado. Abra o caixa no módulo Caixa para vender.'}
            </p>
          </div>
          {lastSaleReceipt && (
            <button
              type="button"
              onClick={() =>
                exportPosReceiptPdf({
                  saleId: lastSaleReceipt.id,
                  date: lastSaleReceipt.createdAt,
                  operatorName: lastSaleReceipt.operatorName || operatorName,
                  customerName: lastSaleReceipt.customerName,
                  paymentMethod: lastSaleReceipt.paymentMethod,
                  items: lastSaleReceipt.items,
                  subtotal: lastSaleReceipt.subtotal,
                  discount: lastSaleReceipt.discount,
                  total: lastSaleReceipt.total,
                  amountPaid: lastSaleReceipt.amountPaid,
                  changeGiven: lastSaleReceipt.changeGiven,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir último recibo PDF</span>
            </button>
          )}
        </div>

        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}
        {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Product Search & Barcode */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <input
              type="text"
              value={pdvSearch}
              onChange={(e) => setPdvSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Bipar código de barras (Enter) ou buscar produto / SKU..."
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm"
            />

            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
              {pdvResults.map((p) => {
                const price = p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price;
                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-stone-900">{p.name}</div>
                      <div className="text-stone-500 font-mono">
                        SKU {p.sku} · Estoque próprio: {p.stockOwn} un
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-tabular font-bold text-stone-900">{formatBRL(price)}</span>
                      <button
                        type="button"
                        onClick={() => addPdvItem(p)}
                        className="px-3 py-1.5 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: PDV Cart & Payment */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-5 space-y-4 text-xs">
            <h2 className="text-base font-bold text-stone-900">Cupom da venda</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pdvCart.length === 0 ? (
                <p className="text-stone-500">Nenhum item adicionado.</p>
              ) : (
                pdvCart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                    <div className="flex-1 truncate font-medium text-stone-900">
                      {item.quantity}x {item.name}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value) || 1);
                        setPdvCart((prev) =>
                          prev.map((x) =>
                            x.productId === item.productId
                              ? { ...x, quantity: qty, total: Number((qty * x.unitPrice).toFixed(2)) }
                              : x
                          )
                        );
                      }}
                      className="w-12 px-1.5 py-1 border border-stone-200 rounded text-center font-mono-tabular"
                    />
                    <span className="w-20 text-right font-mono-tabular font-bold">{formatBRL(item.total)}</span>
                    <button
                      type="button"
                      onClick={() => setPdvCart((prev) => prev.filter((x) => x.productId !== item.productId))}
                      className="text-red-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
              <div>
                <label className="text-stone-600 block mb-1">Cliente</label>
                <select
                  value={pdvCustomerId}
                  onChange={(e) => setPdvCustomerId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-stone-200 rounded-lg bg-white"
                >
                  <option value="">Consumidor balcão / novo</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-stone-600 block mb-1">Desconto (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.50"
                  value={pdvDiscount}
                  onChange={(e) => setPdvDiscount(Number(e.target.value))}
                  className="w-full px-2.5 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                />
              </div>
            </div>

            {!pdvCustomerId && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={pdvQuickCustName}
                  onChange={(e) => setPdvQuickCustName(e.target.value)}
                  placeholder="Nome novo cliente (opcional)"
                  className="px-2.5 py-1.5 border border-stone-200 rounded-lg"
                />
                <input
                  type="email"
                  value={pdvQuickCustEmail}
                  onChange={(e) => setPdvQuickCustEmail(e.target.value)}
                  placeholder="E-mail (opcional)"
                  className="px-2.5 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-stone-200">
              <div className="flex justify-between text-base font-extrabold text-stone-900">
                <span>TOTAL A PAGAR</span>
                <span className="font-mono-tabular">{formatBRL(pdvTotal)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['pix', 'Pix'],
                  ['card', 'Cartão'],
                  ['cash', 'Dinheiro'],
                ].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPdvMethod(m as typeof pdvMethod)}
                    className={`py-2 rounded-lg font-semibold border cursor-pointer ${
                      pdvMethod === m
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pdvMethod === 'cash' && (
                <div className="flex items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-lg">
                  <div>
                    <label className="text-stone-600 block">Recebido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pdvAmountPaid}
                      onChange={(e) => setPdvAmountPaid(Number(e.target.value))}
                      className="w-28 px-2 py-1 border border-stone-200 rounded bg-white font-mono-tabular"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 block">Troco</span>
                    <span className="font-mono-tabular font-bold text-emerald-800 text-sm">
                      {formatBRL(pdvChange)}
                    </span>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-stone-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={pdvPaymentConfirmed}
                  onChange={(e) => setPdvPaymentConfirmed(e.target.checked)}
                />
                <span>Recebimento presencial conferido e confirmado</span>
              </label>

              <button
                type="button"
                onClick={() => void handleFinalizeSale()}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm cursor-pointer"
              >
                Finalizar venda no PDV
              </button>
            </div>
          </div>
        </div>

        {/* Recent PDV Sales with Cancel/Return */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Vendas recentes no PDV</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="p-2">Venda</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Método</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sales.slice(0, 12).map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 font-mono">{s.id}</td>
                    <td className="p-2">{s.customerName || 'Balcão'}</td>
                    <td className="p-2 uppercase">{s.paymentMethod}</td>
                    <td className="p-2 text-right font-mono-tabular font-semibold">{formatBRL(s.total)}</td>
                    <td className="p-2 uppercase">{s.status}</td>
                    <td className="p-2 text-right space-x-2">
                      {s.status === 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void updatePosSaleStatus(s.id, 'canceled', 'Cancelamento autorizado no PDV').then(
                                () => writeAuditLog({ actorUid, action: 'cancel_pdv_sale', module: 'pdv', details: s.id })
                              )
                            }
                            className="text-red-700 hover:underline cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updatePosSaleStatus(s.id, 'returned', 'Devolução registrada no PDV').then(
                                () => writeAuditLog({ actorUid, action: 'return_pdv_sale', module: 'pdv', details: s.id })
                              )
                            }
                            className="text-stone-700 hover:underline cursor-pointer"
                          >
                            Devolução
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- SECTION 10: CASH REGISTER ---
  if (section === 'cash') {
    const summary = openSession
      ? calculateCashSessionSummary(openSession, sales, cashTransactions)
      : null;

    const handleCloseSession = async () => {
      if (!openSession || !summary) return;
      const diff = Number((countedCash - summary.expectedCashInDrawer).toFixed(2));
      await closePosSession({
        sessionId: openSession.id,
        cashTotal: summary.cashSales,
        pixTotal: summary.pixSales,
        cardTotal: summary.cardSales,
        withdrawals: summary.withdrawals,
        reinforcements: summary.reinforcements,
        countedClosingBalance: countedCash,
        cashDifference: diff,
      });
      await writeAuditLog({
        actorUid,
        action: 'close_pos_session',
        module: 'cash',
        details: `Caixa ${openSession.id} fechado com diferença de ${formatBRL(diff)}.`,
      });
      setNotice(`Caixa fechado. Diferença apurada: ${formatBRL(diff)}.`);
    };

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Controle de Caixa</h1>
        {notice && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">{notice}</div>}

        {!openSession ? (
          <div className="bg-white border border-stone-200 rounded-xl p-6 max-w-md space-y-4 text-xs">
            <h2 className="text-base font-bold text-stone-900">Abrir novo turno de caixa</h2>
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Saldo inicial em dinheiro (R$)</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                void openPosSession({ operatorUid: actorUid, operatorName, openingBalance }).then(() =>
                  setNotice('Caixa aberto com sucesso.')
                )
              }
              className="w-full py-2.5 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer"
            >
              Abrir caixa agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 text-xs">
              <h2 className="text-base font-bold text-stone-900">Turno aberto — {openSession.operatorName}</h2>
              <div className="divide-y divide-stone-100">
                <div className="py-2 flex justify-between">
                  <span>Saldo inicial</span>
                  <span className="font-mono-tabular">{formatBRL(openSession.openingBalance)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Vendas Dinheiro</span>
                  <span className="font-mono-tabular">{formatBRL(summary?.cashSales)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Vendas Pix</span>
                  <span className="font-mono-tabular">{formatBRL(summary?.pixSales)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Vendas Cartão</span>
                  <span className="font-mono-tabular">{formatBRL(summary?.cardSales)}</span>
                </div>
                <div className="py-2 flex justify-between text-emerald-800">
                  <span>Reforços</span>
                  <span className="font-mono-tabular">+{formatBRL(summary?.reinforcements)}</span>
                </div>
                <div className="py-2 flex justify-between text-red-700">
                  <span>Sangrias</span>
                  <span className="font-mono-tabular">-{formatBRL(summary?.withdrawals)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-bold text-sm text-stone-900">
                  <span>Dinheiro esperado na gaveta</span>
                  <span className="font-mono-tabular">{formatBRL(summary?.expectedCashInDrawer)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-2">
                <label className="font-semibold text-stone-700 block">Valor contado no fechamento (R$)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCloseSession()}
                    className="px-4 py-2 bg-stone-900 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Fechar caixa
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 text-xs">
              <h2 className="text-base font-bold text-stone-900">Sangria e Reforço de caixa</h2>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as 'sangria' | 'reforco')}
                  className="px-3 py-2 border border-stone-200 rounded-lg bg-white"
                >
                  <option value="sangria">Sangria (Retirada)</option>
                  <option value="reforco">Reforço (Suprimento)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  placeholder="Valor R$"
                  className="px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
                />
              </div>
              <input
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                placeholder="Descrição / justificativa"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() =>
                  void createCashTransaction({
                    posSessionId: openSession.id,
                    type: txType,
                    paymentMethod: 'cash',
                    amount: txAmount,
                    description: txDesc || txType,
                    operatorUid: actorUid,
                  }).then(() => {
                    setTxAmount(0);
                    setTxDesc('');
                    setNotice('Movimentação de caixa registrada.');
                  })
                }
                className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer"
              >
                Lançar movimentação
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">Sessão</th>
                <th className="p-3">Operador</th>
                <th className="p-3 text-right">Inicial</th>
                <th className="p-3 text-right">Dinheiro</th>
                <th className="p-3 text-right">Pix</th>
                <th className="p-3 text-right">Cartão</th>
                <th className="p-3 text-right">Diferença</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {posSessions.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-mono">{s.id}</td>
                  <td className="p-3">{s.operatorName}</td>
                  <td className="p-3 text-right font-mono-tabular">{formatBRL(s.openingBalance)}</td>
                  <td className="p-3 text-right font-mono-tabular">{formatBRL(s.cashTotal)}</td>
                  <td className="p-3 text-right font-mono-tabular">{formatBRL(s.pixTotal)}</td>
                  <td className="p-3 text-right font-mono-tabular">{formatBRL(s.cardTotal)}</td>
                  <td className="p-3 text-right font-mono-tabular">{formatBRL(s.cashDifference || 0)}</td>
                  <td className="p-3 uppercase">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 11: FINANCE ---
  if (section === 'finance') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Financeiro e Comprovantes</h1>
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <th className="p-3">ID / NSU</th>
                <th className="p-3">Provedor</th>
                <th className="p-3">Método</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Verificado API</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    Nenhum pagamento confirmado registrado.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono">{p.orderNsu}</td>
                    <td className="p-3 uppercase">{p.provider}</td>
                    <td className="p-3">{p.method}</td>
                    <td className="p-3 text-right font-mono-tabular font-bold">{formatBRL(p.amountCents / 100)}</td>
                    <td className="p-3">
                      {p.verifiedByApi ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-500">
                          <XCircle className="w-3.5 h-3.5" /> Não
                        </span>
                      )}
                    </td>
                    <td className="p-3 uppercase">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- SECTION 12: EXPENSES ---
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-stone-900">Despesas Operacionais</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveExpense({
            title: expTitle,
            category: expCat,
            amount: expAmount,
            dueDate: expDue,
            paid: expPaid,
            createdBy: actorUid,
          }).then(() => {
            setExpTitle('');
            setExpAmount(0);
          });
        }}
        className="bg-white border border-stone-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
      >
        <div className="sm:col-span-2">
          <label className="font-semibold text-stone-700 block mb-1">Descrição da despesa</label>
          <input
            required
            type="text"
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
            placeholder="Ex: Embalagens, Aluguel, Anúncios..."
            className="w-full px-3 py-2 border border-stone-200 rounded-lg"
          />
        </div>
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Categoria</label>
          <input
            type="text"
            value={expCat}
            onChange={(e) => setExpCat(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg"
          />
        </div>
        <div>
          <label className="font-semibold text-stone-700 block mb-1">Valor (R$)</label>
          <input
            required
            type="number"
            step="0.01"
            value={expAmount}
            onChange={(e) => setExpAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg font-mono-tabular"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer">
          Lançar despesa
        </button>
      </form>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <th className="p-3">Despesa</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Vencimento</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {expenses.map((ex) => (
              <tr key={ex.id}>
                <td className="p-3 font-semibold text-stone-900">{ex.title}</td>
                <td className="p-3 text-stone-600">{ex.category}</td>
                <td className="p-3 font-mono">{ex.dueDate}</td>
                <td className="p-3 text-right font-mono-tabular font-bold">{formatBRL(ex.amount)}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => void deleteExpense(ex.id)}
                    className="text-red-700 hover:underline cursor-pointer"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
