import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Erro inesperado na interface.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-stone-200 rounded-xl p-8">
            <h2 className="text-xl font-bold text-stone-900">Ops! Algo precisou ser interrompido</h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Ocorreu um erro ao processar esta operação. Detalhes técnicos foram registrados para diagnóstico.
            </p>
            <pre className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 overflow-x-auto font-mono">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-emerald-900 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Recarregar PetClick
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
