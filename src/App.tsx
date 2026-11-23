import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StoreHeader } from './components/StoreHeader';
import { CartDrawer } from './components/CartDrawer';
import { VirtualAssistantWidget } from './components/VirtualAssistantWidget';
import { StoreFooter } from './components/StoreFooter';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage, CheckoutPage, OrderConfirmedPage } from './pages/CartAndCheckoutPage';
import { CustomerAuthPage, LegalPage, MyAccountPage } from './pages/AccountAndLegalPages';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

const AppRouter: React.FC = () => {
  const { currentPath, settings, navigate } = useStore();
  const pathname = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminDashboardPage />;
  }

  if (settings.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-3xl font-extrabold text-emerald-950">{settings.storeName}</h1>
        <p className="text-sm text-stone-600 max-w-md">
          Nossa loja está em manutenção programada para atualizações de catálogo. Voltaremos em instantes!
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="text-xs text-stone-400 hover:text-stone-700 underline cursor-pointer"
        >
          Acesso administrativo
        </button>
      </div>
    );
  }

  const renderPage = () => {
    if (pathname === '/') return <HomePage />;
    if (pathname === '/produtos') return <CatalogPage pageTitle="Todos os produtos" />;
    if (pathname === '/caes') return <CatalogPage initialCategorySlug="caes" pageTitle="Produtos para Cães" />;
    if (pathname === '/gatos') return <CatalogPage initialCategorySlug="gatos" pageTitle="Produtos para Gatos" />;
    if (pathname === '/alimentacao')
      return <CatalogPage initialCategorySlug="alimentacao" pageTitle="Alimentação Pet" />;
    if (pathname === '/brinquedos')
      return <CatalogPage initialCategorySlug="brinquedos" pageTitle="Brinquedos" />;
    if (pathname === '/caminhas')
      return <CatalogPage initialCategorySlug="caminhas" pageTitle="Caminhas e Conforto" />;
    if (pathname === '/higiene')
      return <CatalogPage initialCategorySlug="higiene" pageTitle="Higiene e Banho" />;
    if (pathname === '/acessorios')
      return <CatalogPage initialCategorySlug="acessorios" pageTitle="Acessórios" />;
    if (pathname === '/aves')
      return <CatalogPage initialCategorySlug="aves" pageTitle="Aves e Acessórios" />;
    if (pathname === '/roedores')
      return <CatalogPage initialCategorySlug="roedores" pageTitle="Roedores e Pequenos Pets" />;
    if (pathname === '/peixes')
      return <CatalogPage initialCategorySlug="peixes" pageTitle="Peixes e Aquarismo" />;
    if (pathname === '/promocoes') return <CatalogPage onlyPromos pageTitle="Ofertas e Promoções" />;
    if (pathname.startsWith('/produto/')) {
      const slug = decodeURIComponent(pathname.replace('/produto/', ''));
      return <ProductDetailPage slugOrId={slug} />;
    }
    if (pathname === '/carrinho') return <CartPage />;
    if (pathname === '/checkout') return <CheckoutPage />;
    if (pathname === '/pedido-confirmado') return <OrderConfirmedPage />;
    if (pathname === '/entrar') return <CustomerAuthPage mode="login" />;
    if (pathname === '/cadastro') return <CustomerAuthPage mode="register" />;
    if (pathname === '/minha-conta') return <MyAccountPage initialTab="profile" />;
    if (pathname === '/meus-pedidos') return <MyAccountPage initialTab="orders" />;
    if (pathname === '/privacidade') return <LegalPage type="privacy" />;
    if (pathname === '/termos') return <LegalPage type="terms" />;
    if (pathname === '/trocas') return <LegalPage type="returns" />;
    if (pathname === '/contato') return <LegalPage type="contact" />;

    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      <StoreHeader />
      <main className="flex-1">{renderPage()}</main>
      <StoreFooter />
      <CartDrawer />
      <VirtualAssistantWidget />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StoreProvider>
          <AppRouter />
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
