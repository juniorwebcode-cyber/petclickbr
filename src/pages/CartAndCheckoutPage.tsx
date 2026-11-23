import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Lock, Truck, ExternalLink } from 'lucide-react';
import {
  formatBRL,
  formatCep,
  isValidCep,
  isValidCpf,
  normalizeCep,
  normalizeCpf,
} from '../lib/format';
import { calculateCartTotals } from '../lib/pos';
import {
  createPendingOrder,
  saveCustomer,
  saveShippingQuote,
  updateOrderStatus,
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import type { ShippingOption } from '../types/petclick';
import { SmartImage } from '../components/SmartImage';
import { fetchApiJson } from '../lib/http';

export const CartPage: React.FC = () => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    couponError,
    navigate,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');

  const { subtotal, discountTotal, total } = calculateCartTotals(cart, 0, appliedCoupon);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <h1 className="text-3xl font-extrabold text-stone-900">Carrinho de compras</h1>

      {cart.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-4">
          <p className="text-base font-semibold text-stone-900">Seu carrinho está vazio.</p>
          <button
            type="button"
            onClick={() => navigate('/produtos')}
            className="px-5 py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            Continuar comprando
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {cart.map((item) => (
              <div
                key={`${item.productId}_${item.variantId || 'def'}`}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                  <SmartImage src={item.image} alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-stone-900">{item.name}</h3>
                  {item.variantLabel && <p className="text-xs text-stone-500">{item.variantLabel}</p>}
                  <p className="text-xs text-stone-500 mt-0.5 font-mono-tabular">
                    {formatBRL(item.unitPrice)} cada
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={item.maxAvailable}
                    value={item.quantity}
                    onChange={(e) =>
                      updateCartQuantity(item.productId, item.variantId, Number(e.target.value) || 1)
                    }
                    className="w-16 px-2 py-1.5 border border-stone-200 rounded-lg text-sm text-center font-mono-tabular"
                  />
                  <div className="w-24 text-right text-sm font-bold font-mono-tabular text-stone-900">
                    {formatBRL(item.unitPrice * item.quantity)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="text-xs text-red-700 hover:underline cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-stone-900">Resumo</h2>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 block">Cupom de desconto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="EX: PET10"
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-xs font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => applyCouponCode(couponInput)}
                  className="px-3.5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
              {couponError && <p className="text-xs text-red-700">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg">
                  <span>Cupom {appliedCoupon.code} aplicado</span>
                  <button type="button" onClick={removeCoupon} className="underline cursor-pointer">
                    Remover
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-stone-100 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-mono-tabular">{formatBRL(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Desconto</span>
                  <span className="font-mono-tabular">-{formatBRL(discountTotal)}</span>
                </div>
              )}
              <div className="space-y-1 pt-2 border-t border-stone-100">
                <label className="text-xs font-semibold text-stone-700 block">
                  Forma de pagamento (Parcelas)
                </label>
                {(() => {
                  const [cartInst, setCartInst] = useState(1);
                  const assured = 3;
                  const rate = 0.0349;
                  const calc = (() => {
                    if (cartInst <= assured) {
                      return { perMonth: total / cartInst, finalTotal: total, hasInterest: false };
                    }
                    const factor = (rate * Math.pow(1 + rate, cartInst)) / (Math.pow(1 + rate, cartInst) - 1);
                    const per = total * factor;
                    return { perMonth: per, finalTotal: per * cartInst, hasInterest: true };
                  })();

                  return (
                    <div className="space-y-2">
                      <select
                        value={cartInst}
                        onChange={(e) => setCartInst(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white font-medium"
                      >
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const n = idx + 1;
                          const instVal = n <= assured ? total / n : (total * ((rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)));
                          return (
                            <option key={n} value={n}>
                              {n}x de {formatBRL(instVal)} {n <= assured ? 'sem juros' : '(com juros automáticos)'}
                            </option>
                          );
                        })}
                      </select>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs space-y-0.5">
                        <div className="flex justify-between font-bold text-emerald-950">
                          <span>Valor final a prazo:</span>
                          <span className="font-mono-tabular">{formatBRL(calc.finalTotal)}</span>
                        </div>
                        <div className="text-[11px] text-stone-600">
                          {cartInst}x de <strong className="font-mono-tabular text-stone-900">{formatBRL(calc.perMonth)}</strong> {calc.hasInterest ? 'com juros automáticos InfinitePay' : 'sem juros'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              Ir para o checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const { cart, appliedCoupon, shippingSettings, clearCart, navigate } = useStore();
  const { firebaseUser, profile, loginWithGoogle } = useAuth();

  const [name, setName] = useState(profile?.name || firebaseUser?.displayName || '');
  const [email, setEmail] = useState(profile?.email || firebaseUser?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  const [cepStatus, setCepStatus] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingStatusMsg, setShippingStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [generatedCheckout, setGeneratedCheckout] = useState<{
    url: string;
    orderNsu: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (firebaseUser) {
      if (!name) setName(profile?.name || firebaseUser.displayName || '');
      if (!email) setEmail(profile?.email || firebaseUser.email || '');
    }
  }, [firebaseUser, profile]);

  const { subtotal, discountTotal, totalWeightKg } = calculateCartTotals(cart, 0, appliedCoupon);
  const packageHeightCm = Math.max(10, ...cart.map((c) => c.heightCm || 12));
  const packageWidthCm = Math.max(12, ...cart.map((c) => c.widthCm || 16));
  const packageLengthCm = Math.max(
    16,
    Math.min(90, cart.reduce((acc, c) => acc + Math.max(5, c.lengthCm || 15) * c.quantity, 0))
  );

  const shippingCost = selectedShipping ? selectedShipping.price : 0;
  const grandTotal = Number(Math.max(0, subtotal - discountTotal + shippingCost).toFixed(2));

  const fetchShippingForCep = async (cleanCep: string, explicitUf?: string) => {
    setShippingLoading(true);
    try {
      const quoteRes = await fetchApiJson<{
        options?: ShippingOption[];
        correiosStatusMessage?: string;
      }>('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep: cleanCep,
          destinationState: explicitUf || stateUf,
          subtotal,
          weightKg: totalWeightKg,
          heightCm: packageHeightCm,
          widthCm: packageWidthCm,
          lengthCm: packageLengthCm,
          storeShippingSettings: shippingSettings,
        }),
      });

      if (!quoteRes.ok) {
        setShippingStatusMsg(quoteRes.data.error || 'Não foi possível calcular o frete agora.');
        return;
      }

      const opts = (quoteRes.data.options || []) as ShippingOption[];
      setShippingOptions(opts);

      const defaultOption =
        opts.find((o) => o.id === 'frete_gratis') ||
        opts.find((o) => o.id.startsWith('correios_')) ||
        opts[0] ||
        null;
      setSelectedShipping(defaultOption);
      setShippingStatusMsg(quoteRes.data.correiosStatusMessage || '');

      if (defaultOption) {
        void saveShippingQuote({
          originCep: shippingSettings.originCep,
          destinationCep: cleanCep,
          method: defaultOption.label,
          price: defaultOption.price,
          estimatedDays: defaultOption.estimatedDays,
          source: defaultOption.source,
        }).catch(() => {});
      }
    } catch {
      setShippingStatusMsg('Erro ao calcular opções de envio.');
    } finally {
      setShippingLoading(false);
    }
  };

  const lookupCepAndShipping = async (rawCep: string, forceQuote = false) => {
    const clean = normalizeCep(rawCep);
    setCep(formatCep(clean));
    if (clean.length !== 8) {
      if (forceQuote) {
        setCepStatus('Informe um CEP completo com 8 dígitos para calcular os Correios.');
      }
      return;
    }

    setCepStatus('Consultando CEP...');
    let resolvedUf = stateUf;
    try {
      const cepRes = await fetchApiJson<{
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        source?: string;
      }>(`/api/cep/${clean}`);

      if (cepRes.ok) {
        setStreet(cepRes.data.street || '');
        setNeighborhood(cepRes.data.neighborhood || '');
        setCity(cepRes.data.city || '');
        resolvedUf = cepRes.data.state || resolvedUf;
        setStateUf(cepRes.data.state || '');
        setCepStatus(`Endereço localizado via ${cepRes.data.source || 'ViaCEP'}. Informe número e complemento.`);
      } else {
        setCepStatus(cepRes.data.error || 'CEP não localizado. Preencha manualmente.');
      }

      await fetchShippingForCep(clean, resolvedUf);
    } catch {
      setCepStatus('Erro ao consultar serviço de CEP.');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firebaseUser) {
      setErrorMsg('Entre com sua conta antes de finalizar o pedido para acompanhar seu pagamento.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Seu carrinho está vazio.');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Preencha nome completo, e-mail e telefone.');
      return;
    }
    if (cpf.trim() && !isValidCpf(cpf)) {
      setErrorMsg('CPF inválido. Verifique os dígitos informados.');
      return;
    }
    if (!isValidCep(cep) || !street.trim() || !number.trim() || !city.trim() || !stateUf.trim()) {
      setErrorMsg('Preencha o endereço completo incluindo CEP, rua, número, cidade e estado.');
      return;
    }
    if (!selectedShipping) {
      setErrorMsg('Calcule o CEP e selecione uma modalidade de frete válida antes de prosseguir.');
      return;
    }

    setSubmitting(true);
    try {
      const orderNsu = `PC${Date.now()}`;

      await saveCustomer({
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: normalizeCpf(cpf),
        cep: normalizeCep(cep),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: stateUf.trim().toUpperCase(),
      });

      await createPendingOrder({
        orderNsu,
        customerId: firebaseUser.uid,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        customerCpf: normalizeCpf(cpf),
        shippingAddress: {
          cep: normalizeCep(cep),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: stateUf.trim().toUpperCase(),
        },
        shippingMethod: selectedShipping.label,
        status: 'pending_payment',
        subtotal,
        discountTotal,
        couponCode: appliedCoupon?.code || '',
        shippingCost: selectedShipping.price,
        total: grandTotal,
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          variantLabel: i.variantLabel || '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitCost: i.costPrice,
        })),
      });

      const checkoutRes = await fetchApiJson<{
        ok?: boolean;
        checkoutUrl?: string;
        slug?: string;
      }>('/api/checkout/infinitepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNsu,
          items: cart.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          customer: {
            uid: firebaseUser.uid,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          address: {
            cep: normalizeCep(cep),
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: stateUf.trim().toUpperCase(),
          },
          shippingCost: selectedShipping.price,
          discountTotal,
          assuredInstallments: selectedInstallments,
          redirectUrl: `${window.location.origin}/pedido-confirmado?order_nsu=${encodeURIComponent(orderNsu)}`,
        }),
      });

      const data = checkoutRes.data;
      if (!checkoutRes.ok || !data.checkoutUrl) {
        setErrorMsg(
          data.error ||
            'Não foi possível gerar o link oficial de pagamento da InfinitePay no momento. Tente novamente.'
        );
        setSubmitting(false);
        return;
      }

      let safeCheckoutUrl = '';
      try {
        const parsedCheckout = new URL(data.checkoutUrl);
        if (parsedCheckout.protocol === 'https:') {
          safeCheckoutUrl = parsedCheckout.toString();
        }
      } catch {
        safeCheckoutUrl = '';
      }

      if (!safeCheckoutUrl) {
        setErrorMsg('URL de checkout retornada pelo provedor é inválida.');
        setSubmitting(false);
        return;
      }

      try {
        await updateOrderStatus(orderNsu, {
          checkoutUrl: safeCheckoutUrl,
          slug: data.slug || '',
        });
      } catch {
        // Pedido já salvo; não bloquear abertura do checkout caso haja latência na atualização auxiliar
      }

      setGeneratedCheckout({
        url: safeCheckoutUrl,
        orderNsu,
        total: grandTotal,
      });
      setSubmitting(false);
      clearCart();

      const isEmbeddedIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      if (!isEmbeddedIframe) {
        window.location.assign(safeCheckoutUrl);
      } else {
        try {
          window.top?.location.assign(safeCheckoutUrl);
        } catch {
          // Ambiente em preview bloqueia redirecionamento cross-origin no frame; card exibe botão direto em nova aba
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao iniciar checkout.');
      setSubmitting(false);
    }
  };

  if (generatedCheckout) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-5 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-stone-900">
              Link oficial InfinitePay gerado!
            </h1>
            <p className="text-sm text-stone-600">
              Pedido <strong className="font-mono">{generatedCheckout.orderNsu}</strong> no valor de{' '}
              <strong className="font-mono-tabular">{formatBRL(generatedCheckout.total)}</strong> pronto para pagamento via Pix ou Cartão.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href={generatedCheckout.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <span>Abrir Pagamento InfinitePay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => navigate('/meus-pedidos')}
              className="px-5 py-3.5 border border-stone-300 hover:bg-stone-50 text-stone-800 text-sm font-semibold rounded-xl cursor-pointer"
            >
              Acompanhar em Meus Pedidos
            </button>
          </div>

          <p className="text-xs text-stone-500">
            Caso o redirecionamento automático não tenha aberto na tela inteira, clique no botão laranja acima para concluir no checkout oficial da InfinitePay.
          </p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">Sua sacola está vazia</h1>
        <button
          type="button"
          onClick={() => navigate('/produtos')}
          className="px-5 py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          Explorar produtos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-extrabold text-stone-900">Finalizar pedido</h1>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
          <Lock className="w-4 h-4" />
          <span>Checkout oficial InfinitePay</span>
        </div>
      </div>

      {!firebaseUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Identifique-se para continuar</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Entre com Google ou crie sua conta de cliente para acompanhar o status do pagamento e entrega.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loginWithGoogle()}
              className="px-4 py-2 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Entrar com Google
            </button>
            <button
              type="button"
              onClick={() => navigate('/entrar')}
              className="px-4 py-2 border border-stone-300 bg-white text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              E-mail e senha
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-900">1. Dados do cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Nome completo</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">E-mail</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Telefone / WhatsApp</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">CPF (opcional ou fiscal)</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono-tabular"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-900">2. Endereço de entrega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-stone-700 block mb-1">CEP</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={cep}
                    onChange={(e) => void lookupCepAndShipping(e.target.value)}
                    placeholder="00000-000"
                    className="flex-1 min-w-0 px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono-tabular"
                  />
                  <button
                    type="button"
                    disabled={shippingLoading}
                    onClick={() => void lookupCepAndShipping(cep, true)}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {shippingLoading ? 'Calculando...' : 'Calcular'}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-3 flex items-end">
                {cepStatus && <p className="text-xs text-emerald-800 pb-2">{cepStatus}</p>}
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Rua / Logradouro</label>
                <input
                  required
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Número</label>
                <input
                  required
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Complemento</label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, bloco..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Bairro</label>
                <input
                  required
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Cidade</label>
                <input
                  required
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-700 block mb-1">Estado (UF)</label>
                <input
                  required
                  maxLength={2}
                  type="text"
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm uppercase"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-800" />
              <h2 className="text-base font-bold text-stone-900">3. Modalidade de frete</h2>
            </div>

            {shippingOptions.length === 0 ? (
              <p className="text-xs text-stone-500">
                Informe um CEP válido acima para carregar as modalidades disponíveis.
              </p>
            ) : (
              <div className="space-y-2">
                {shippingOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${
                      selectedShipping?.id === opt.id
                        ? 'border-emerald-900 bg-emerald-50/60'
                        : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingOption"
                        checked={selectedShipping?.id === opt.id}
                        onChange={() => setSelectedShipping(opt)}
                      />
                      <div>
                        <div className="text-sm font-semibold text-stone-900">{opt.label}</div>
                        <div className="text-xs text-stone-500">
                          {opt.carrier} · Prazo estimado: {opt.estimatedDays} dia(s) útil(eis)
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono-tabular text-stone-900">
                      {opt.price === 0 ? 'Grátis' : formatBRL(opt.price)}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {shippingStatusMsg && <p className="text-[11px] text-stone-500">{shippingStatusMsg}</p>}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-stone-900">Resumo do pedido</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={`${item.productId}_${item.variantId || 'def'}`}
                className="flex justify-between text-xs gap-3"
              >
                <span className="text-stone-700">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-mono-tabular font-semibold text-stone-900 shrink-0">
                  {formatBRL(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-stone-200 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-mono-tabular">{formatBRL(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Desconto</span>
                <span className="font-mono-tabular">-{formatBRL(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Frete</span>
              <span className="font-mono-tabular">
                {selectedShipping ? (shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total</span>
              <span className="font-mono-tabular">{formatBRL(grandTotal)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-900 block">
                Escolha quantas vezes (Parcelas Cartão)
              </label>
              <p className="text-[11px] text-stone-500">
                Até {shippingSettings.assuredInstallments || 3}x sem juros. Acima disso, incidem os juros automáticos da InfinitePay.
              </p>
              {(() => {
                const assured = shippingSettings.assuredInstallments || 3;
                const rate = 0.0349;
                const calc = (() => {
                  if (selectedInstallments <= assured) {
                    return { perMonth: grandTotal / selectedInstallments, finalTotal: grandTotal, hasInterest: false };
                  }
                  const factor = (rate * Math.pow(1 + rate, selectedInstallments)) / (Math.pow(1 + rate, selectedInstallments) - 1);
                  const per = grandTotal * factor;
                  return { perMonth: per, finalTotal: per * selectedInstallments, hasInterest: true };
                })();

                return (
                  <div className="space-y-2 pt-1">
                    <select
                      value={selectedInstallments}
                      onChange={(e) => setSelectedInstallments(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs bg-white font-semibold text-stone-900 cursor-pointer"
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const n = idx + 1;
                        const instVal = n <= assured ? grandTotal / n : (grandTotal * ((rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)));
                        return (
                          <option key={n} value={n}>
                            {n}x de {formatBRL(instVal)} {n <= assured ? 'sem juros' : '(com juros automáticos)'}
                          </option>
                        );
                      })}
                    </select>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                      <div className="flex justify-between font-extrabold text-emerald-950 text-sm">
                        <span>Valor final escolhido:</span>
                        <span className="font-mono-tabular">{formatBRL(calc.finalTotal)}</span>
                      </div>
                      <div className="text-xs text-stone-700">
                        {selectedInstallments}x de <strong className="font-mono-tabular text-stone-900 font-bold">{formatBRL(calc.perMonth)}</strong> {calc.hasInterest ? '(c/ juros automáticos InfinitePay)' : '(sem juros)'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !firebaseUser}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Gerando checkout seguro...' : 'Pagar com Pix ou Cartão (InfinitePay)'}</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-stone-500 text-center">
            Você será redirecionado ao ambiente oficial da InfinitePay para concluir seu pagamento com segurança.
          </p>
        </div>
      </form>
    </div>
  );
};

export const OrderConfirmedPage: React.FC = () => {
  const { navigate } = useStore();
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'error'>('loading');
  const [details, setDetails] = useState<{ orderNsu: string; method?: string; amount?: number; message?: string }>({
    orderNsu: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNsu = params.get('order_nsu') || '';
    const transactionNsu = params.get('transaction_nsu') || undefined;
    const slug = params.get('slug') || undefined;

    if (!orderNsu) {
      setStatus('error');
      setDetails({ orderNsu: '', message: 'Identificador do pedido ausente na URL de retorno.' });
      return;
    }

    fetchApiJson<{
      paid?: boolean;
      capture_method?: string;
      amount?: number;
      error?: string;
      message?: string;
    }>('/api/checkout/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNsu, transactionNsu, slug }),
    })
      .then(({ data }) => {
        if (data.paid === true) {
          setStatus('paid');
          setDetails({
            orderNsu,
            method: data.capture_method || 'InfinitePay',
            amount: data.amount ? data.amount / 100 : undefined,
          });
        } else {
          setStatus('pending');
          setDetails({
            orderNsu,
            message:
              data.error ||
              data.message ||
              'Pagamento ainda aguardando compensação oficial na InfinitePay.',
          });
        }
      })
      .catch(() => {
        setStatus('error');
        setDetails({ orderNsu, message: 'Não foi possível validar o pagamento neste momento.' });
      });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-5">
        {status === 'loading' && (
          <p className="text-sm text-stone-600">Validando pagamento junto à API oficial InfinitePay...</p>
        )}

        {status === 'paid' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
            <h1 className="text-2xl font-extrabold text-stone-900">Pagamento confirmado!</h1>
            <p className="text-sm text-stone-600">
              Pedido <strong className="font-mono">{details.orderNsu}</strong> confirmado via{' '}
              <strong>{details.method}</strong>
              {details.amount ? ` (${formatBRL(details.amount)})` : ''}.
            </p>
          </>
        )}

        {(status === 'pending' || status === 'error') && (
          <>
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />
            <h1 className="text-2xl font-extrabold text-stone-900">
              {status === 'pending' ? 'Pagamento em processamento' : 'Verificação pendente'}
            </h1>
            <p className="text-sm text-stone-600">{details.message}</p>
            {details.orderNsu && (
              <p className="text-xs font-mono text-stone-500">Pedido: {details.orderNsu}</p>
            )}
          </>
        )}

        <div className="pt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/meus-pedidos')}
            className="px-5 py-2.5 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Meus pedidos
          </button>
          <button
            type="button"
            onClick={() => navigate('/produtos')}
            className="px-5 py-2.5 border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Continuar na loja
          </button>
        </div>
      </div>
    </div>
  );
};
