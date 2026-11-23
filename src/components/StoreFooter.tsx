import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';

export const StoreFooter: React.FC = () => {
  const { navigate, settings } = useStore();
  const whatsappClean = (settings.whatsapp || '').replace(/\D/g, '');

  return (
    <>
      <footer className="bg-emerald-950 text-stone-200 mt-16 border-t border-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="PetClick Início"
              className="cursor-pointer block text-left"
            >
              <BrandLogo variant="footer" />
            </button>
            <p className="mt-3 text-sm text-emerald-100/85 leading-relaxed font-medium">
              {settings.slogan}
            </p>
            <p className="mt-4 text-xs text-emerald-200/70 leading-relaxed">
              {settings.address}
              <br />
              {settings.businessHours}
              <br />
              {settings.email}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Departamentos</h3>
            <ul className="space-y-2 text-sm text-emerald-100/80">
              {[
                ['Todos os produtos', '/produtos'],
                ['Cães', '/caes'],
                ['Gatos', '/gatos'],
                ['Alimentação', '/alimentacao'],
                ['Brinquedos', '/brinquedos'],
                ['Caminhas', '/caminhas'],
                ['Higiene', '/higiene'],
                ['Acessórios', '/acessorios'],
              ].map(([label, path]) => (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => navigate(path)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Cliente e Atendimento</h3>
            <ul className="space-y-2 text-sm text-emerald-100/80">
              {[
                ['Entrar', '/entrar'],
                ['Criar conta', '/cadastro'],
                ['Minha conta', '/minha-conta'],
                ['Meus pedidos', '/meus-pedidos'],
                ['Carrinho', '/carrinho'],
                ['Contato', '/contato'],
              ].map(([label, path]) => (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => navigate(path)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Institucional e Segurança</h3>
            <ul className="space-y-2 text-sm text-emerald-100/80">
              {[
                ['Política de privacidade', '/privacidade'],
                ['Termos de uso', '/termos'],
                ['Trocas e devoluções', '/trocas'],
                ['Painel administrativo', '/admin'],
              ].map(([label, path]) => (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => navigate(path)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-emerald-200/70">
              Pagamentos processados via redirecionamento oficial InfinitePay (Pix e Cartão).
            </p>
          </div>
        </div>

        <div className="border-t border-emerald-900/80 py-5 px-4 sm:px-6 text-center text-xs text-emerald-200/70">
          {settings.footerText}
        </div>
      </footer>

      {whatsappClean.length >= 10 && (
        <a
          href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent('Olá! Gostaria de falar com a equipe PetClick.')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Atendimento via WhatsApp"
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-full shadow-lg transition-transform hover:-translate-y-0.5 no-print"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </>
  );
};
