import React, { useState } from 'react';
import { Menu, ShoppingBag, User, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';

export const StoreHeader: React.FC = () => {
  const { currentPath, navigate, settings, cartCount, setCartDrawerOpen } = useStore();
  const { firebaseUser, isStaff, serverAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const navItems = [
    { label: 'Início', path: '/' },
    { label: 'Produtos', path: '/produtos' },
    { label: 'Cães', path: '/caes' },
    { label: 'Gatos', path: '/gatos' },
    { label: 'Promoções', path: '/promocoes' },
  ];

  const isActive = (path: string) =>
    path === '/' ? currentPath === '/' : currentPath.startsWith(path);

  return (
    <div className="sticky top-0 z-40">
      {settings.announcementText && !bannerDismissed && (
        <div className="bg-emerald-950 text-stone-100 text-xs px-4 py-2 flex items-center justify-center gap-4">
          <span className="truncate">{settings.announcementText}</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Fechar aviso"
            className="text-stone-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-6">
          {/* Zone 1: Full Legible PetClick Brand Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Ir para a página inicial da PetClick"
            className="flex items-center shrink-0 py-1 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            <BrandLogo variant="header" />
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive(item.path)
                    ? 'text-emerald-900 border-orange-600'
                    : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Unified Action Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(isStaff || serverAdmin ? '/admin' : firebaseUser ? '/minha-conta' : '/entrar')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isStaff || serverAdmin ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                  <span>Painel</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>{firebaseUser ? 'Minha conta' : 'Entrar'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-mono-tabular">Sacola ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menu"
              className="md:hidden p-2 text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-stone-200 px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(item.path) ? 'bg-emerald-50 text-emerald-900' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate(firebaseUser ? '/minha-conta' : '/entrar');
                  setMobileOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {firebaseUser ? 'Minha conta e pedidos' : 'Entrar / Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/admin');
                  setMobileOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                Painel Administrativo
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};
