import React, { useEffect, useState } from 'react';
import { orderBy, where } from 'firebase/firestore';
import { formatBRL, formatDateTimeBR } from '../lib/format';
import { subscribeCollection } from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from '../components/BrandLogo';
import type { Order } from '../types/petclick';

export const CustomerAuthPage: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const { loginWithGoogle, loginCustomerEmail, registerCustomerEmail, sendResetPassword, firebaseUser } =
    useAuth();
  const { navigate } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (firebaseUser) navigate('/minha-conta');
  }, [firebaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await registerCustomerEmail(name, email, password);
      } else {
        await loginCustomerEmail(email, password);
      }
      navigate('/minha-conta');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de autenticação.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Login por E-mail/Senha ainda não foi habilitado no console do Firebase. Use "Entrar com Google" ou ative o provedor Email/Password no Firebase Authentication.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }
    try {
      await sendResetPassword(email);
      setNotice('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <BrandLogo variant="auth" />
          <h1 className="text-2xl font-extrabold text-stone-900">
            {mode === 'register' ? 'Criar conta PetClick' : 'Entrar na sua conta'}
          </h1>
          <p className="text-xs text-stone-500">
            Acompanhe pedidos, endereços e avaliações em segurança.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loginWithGoogle().catch((e) => setError(e.message))}
          className="w-full py-2.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Continuar com Google
        </button>

        <div className="relative flex items-center justify-center text-xs text-stone-400">
          <span className="bg-white px-3 z-10">ou com e-mail e senha</span>
          <div className="absolute inset-x-0 border-t border-stone-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Nome completo</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
          )}
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
            <label className="text-xs font-semibold text-stone-700 block mb-1">Senha</label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg">{error}</p>}
          {notice && <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            {busy ? 'Processando...' : mode === 'register' ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={handleReset} className="hover:underline cursor-pointer">
                Esqueci a senha
              </button>
              <button
                type="button"
                onClick={() => navigate('/cadastro')}
                className="font-semibold text-emerald-900 hover:underline cursor-pointer"
              >
                Criar conta
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/entrar')}
              className="font-semibold text-emerald-900 hover:underline cursor-pointer"
            >
              Já tenho conta — Entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const MyAccountPage: React.FC<{ initialTab?: 'profile' | 'orders' }> = ({
  initialTab = 'profile',
}) => {
  const { firebaseUser, profile, logout, isStaff } = useAuth();
  const { navigate } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeCollection<Order>(
      'orders',
      [where('customerId', '==', firebaseUser.uid), orderBy('createdAt', 'desc')],
      setOrders,
      () => {}
    );
    return () => unsub();
  }, [firebaseUser?.uid]);

  if (!firebaseUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">Acesso restrito ao cliente</h1>
        <p className="text-sm text-stone-600">Entre para visualizar seus dados e pedidos.</p>
        <button
          type="button"
          onClick={() => navigate('/entrar')}
          className="px-5 py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          Entrar agora
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            Olá, {profile?.name || firebaseUser.displayName || 'Cliente'}
          </h1>
          <p className="text-xs text-stone-500">{firebaseUser.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Abrir Painel Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout().then(() => navigate('/'))}
            className="px-4 py-2 border border-stone-300 bg-white text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigate('/minha-conta')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            initialTab === 'profile' ? 'bg-emerald-900 text-white' : 'bg-white border border-stone-200'
          }`}
        >
          Dados da conta
        </button>
        <button
          type="button"
          onClick={() => navigate('/meus-pedidos')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            initialTab === 'orders' ? 'bg-emerald-900 text-white' : 'bg-white border border-stone-200'
          }`}
        >
          Meus pedidos ({orders.length})
        </button>
      </div>

      {initialTab === 'profile' ? (
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3 text-sm">
          <div>
            <span className="text-stone-500">Nome:</span>{' '}
            <strong className="text-stone-900">{profile?.name || firebaseUser.displayName}</strong>
          </div>
          <div>
            <span className="text-stone-500">E-mail:</span>{' '}
            <strong className="text-stone-900">{firebaseUser.email}</strong>
          </div>
          <div>
            <span className="text-stone-500">Perfil:</span>{' '}
            <strong className="text-stone-900 uppercase">{profile?.role || 'customer'}</strong>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-600">
              Você ainda não realizou pedidos na loja.
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-sm font-bold font-mono text-stone-900">Pedido #{ord.orderNsu}</span>
                    <span className="text-xs text-stone-500 ml-3">{formatDateTimeBR(ord.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase text-emerald-900">{ord.status}</span>
                    <span className="text-sm font-bold font-mono-tabular text-stone-900">
                      {formatBRL(ord.total)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-stone-600 space-y-1">
                  {ord.items?.map((it, idx) => (
                    <div key={idx}>
                      {it.quantity}x {it.name} — {formatBRL(it.unitPrice * it.quantity)}
                    </div>
                  ))}
                </div>
                {ord.status === 'pending_payment' && ord.checkoutUrl && (
                  <a
                    href={ord.checkoutUrl}
                    className="inline-block px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Concluir pagamento na InfinitePay
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const LegalPage: React.FC<{ type: 'privacy' | 'terms' | 'returns' | 'contact' }> = ({
  type,
}) => {
  const { settings } = useStore();
  const [contactSent, setContactSent] = useState(false);

  const titles = {
    privacy: 'Política de Privacidade (LGPD)',
    terms: 'Termos de Uso',
    returns: 'Trocas e Devoluções',
    contact: 'Fale com a PetClick',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-extrabold text-stone-900">{titles[type]}</h1>
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-sm text-stone-700 leading-relaxed space-y-4">
        {type === 'privacy' && <p>{settings.privacyPolicyText}</p>}
        {type === 'terms' && <p>{settings.termsText}</p>}
        {type === 'returns' && <p>{settings.returnsPolicyText}</p>}
        {type === 'contact' && (
          <div className="space-y-5">
            <div className="space-y-1">
              <p>
                <strong>E-mail:</strong> {settings.email}
              </p>
              <p>
                <strong>Endereço:</strong> {settings.address}
              </p>
              <p>
                <strong>Horário de atendimento:</strong> {settings.businessHours}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setContactSent(true);
              }}
              className="space-y-3 pt-4 border-t border-stone-200"
            >
              <input
                required
                type="text"
                placeholder="Seu nome"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
              <input
                required
                type="email"
                placeholder="Seu e-mail"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
              <textarea
                required
                rows={4}
                placeholder="Como podemos ajudar você e seu pet?"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
              {contactSent && (
                <p className="text-xs text-emerald-800 font-medium">
                  Mensagem registrada! Nossa equipe responderá em breve.
                </p>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Enviar mensagem
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
