import React, { useEffect, useState } from 'react';
import { Lock, ShieldAlert, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../../components/BrandLogo';

interface AdminStatusResponse {
  configured: boolean;
  adminEmailHint: string;
  mustChangePassword: boolean;
  lockoutSecondsRemaining: number;
}

export const AdminLoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    firebaseUser,
    isStaff,
    role,
    authReady,
    serverAdmin,
    setServerAdminSession,
    loginWithGoogle,
    loginCustomerEmail,
    sendResetPassword,
    getAuthHeaders,
    logout,
  } = useAuth();
  const { navigate } = useStore();

  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [email, setEmail] = useState('admin@x.com');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = (await res.json()) as AdminStatusResponse;
      setStatus(data);
      if (data.adminEmailHint) setEmail(data.adminEmailHint);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Defina uma senha forte com pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao inicializar administrador.');
      } else {
        setServerAdminSession({
          token: data.token,
          email: data.email,
          role: 'admin',
          mustChangePassword: false,
        });
        await loadStatus();
      }
    } catch {
      setError('Falha ao comunicar com o servidor.');
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha de autenticação administrativa.');
        await loadStatus();
      } else {
        setServerAdminSession({
          token: data.token,
          email: data.email,
          role: 'admin',
          mustChangePassword: Boolean(data.mustChangePassword),
        });
        // Also try Firebase Email/Password sign-in if enabled in project
        try {
          await loginCustomerEmail(email, password);
        } catch {
          // Google Auth can be linked below if Email/Password provider is disabled
        }
      }
    } catch {
      setError('Erro de conexão com o servidor de autenticação.');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeInitialPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    setBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao alterar senha.');
      } else {
        setServerAdminSession({
          token: data.token,
          email: serverAdmin?.email || email,
          role: 'admin',
          mustChangePassword: false,
        });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Erro ao atualizar senha no servidor.');
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-sm text-stone-500">
        Verificando credenciais administrativas...
      </div>
    );
  }

  // Force password change on first access when using initial env password
  if (serverAdmin?.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-2.5 text-orange-600">
            <KeyRound className="w-6 h-6" />
            <h1 className="text-xl font-extrabold text-stone-900">Alteração obrigatória de senha</h1>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Por segurança, altere a senha administrativa inicial antes de acessar o painel ERP e financeiro da PetClick.
          </p>
          <form onSubmit={handleChangeInitialPassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Nova senha (mín. 8 caracteres)</label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Confirmar nova senha</label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {busy ? 'Salvando...' : 'Atualizar senha e acessar painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Block regular logged-in customers from accessing admin
  if (firebaseUser && !isStaff && !serverAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto" />
          <h1 className="text-xl font-extrabold text-stone-900">Acesso não autorizado</h1>
          <p className="text-sm text-stone-600">
            A conta <strong>{firebaseUser.email}</strong> possui perfil <strong>{role}</strong> e não tem permissão para acessar o Painel Administrativo PetClick.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Voltar à loja
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Trocar conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isStaff || serverAdmin) {
    return <>{children}</>;
  }

  // Admin Sign-in / First-Run Claim Form
  const needsBootstrap = status ? !status.configured : false;

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <BrandLogo variant="auth" />
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-emerald-900" />
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">PetClick ERP & PDV</p>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900">Acesso Administrativo</h1>
        </div>

        <button
          type="button"
          onClick={() => void loginWithGoogle().catch((e) => setError(e.message))}
          className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Entrar com Google (Administrador Firebase)
        </button>

        <div className="relative flex items-center justify-center text-xs text-stone-400">
          <span className="bg-white px-3 z-10">ou credenciais de servidor</span>
          <div className="absolute inset-x-0 border-t border-stone-200" />
        </div>

        {needsBootstrap ? (
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950">
              Primeiro acesso detectado: defina a senha do administrador inicial (<strong>{email}</strong>). Ela será armazenada com hash seguro scrypt no servidor.
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">E-mail administrativo</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Definir senha forte (mín. 8 caracteres)</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {busy ? 'Configurando...' : 'Inicializar e entrar no painel'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-4">
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
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {busy ? 'Validando...' : 'Entrar no painel'}
            </button>
            <button
              type="button"
              onClick={() =>
                void sendResetPassword(email)
                  .then(() => setNotice('E-mail de redefinição enviado via Firebase Auth.'))
                  .catch((e) => setError(e.message))
              }
              className="w-full text-xs text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
            >
              Recuperar senha via Firebase Authentication
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-center text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
        >
          ← Voltar para a vitrine PetClick
        </button>
      </div>
    </div>
  );
};
