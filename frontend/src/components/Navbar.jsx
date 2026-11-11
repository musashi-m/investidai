import React from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  Settings, 
  PieChart, 
  Landmark, 
  History, 
  Key,
  ShieldCheck,
  Calculator,
  Search,
  Bell
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onRefreshQuotes, 
  isRefreshing, 
  onOpenNewTransaction, 
  onOpenSettings,
  hasBrapiToken,
  portfolioName
}) {
  const tabs = [
    { id: 'dashboard', label: 'Minha Carteira', icon: PieChart },
    { id: 'fixed', label: 'Renda Fixa', icon: Landmark },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'transactions', label: 'Lançamentos', icon: History },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Investidor10 Style */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-lg tracking-tighter">10</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">Investidor<span className="text-blue-600">10</span></span>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.2 rounded">
                  CARTEIRA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">{portfolioName || 'Minha Carteira'}</p>
            </div>
          </div>

          {/* Abas Centrais Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Ações da Direita */}
          <div className="flex items-center space-x-2">
            
            {/* Status Brapi Token */}
            <button
              onClick={onOpenSettings}
              title={hasBrapiToken ? "Brapi conectada" : "Configurar Token Brapi"}
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                hasBrapiToken
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {hasBrapiToken ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Key className="w-3.5 h-3.5 text-amber-600" />}
              <span>{hasBrapiToken ? "Brapi Ativa" : "Inserir Token"}</span>
            </button>

            {/* Botão Sincronizar Cotações */}
            <button
              onClick={onRefreshQuotes}
              disabled={isRefreshing}
              title="Atualizar cotações em tempo real"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-gray-200 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Botão + Adicionar Lançamento (Estilo Investidor10: Dark Button) */}
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>Adicionar Lançamento</span>
            </button>

            {/* Configurações */}
            <button
              onClick={onOpenSettings}
              title="Configurações da Carteira"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-gray-200 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Abas Mobile */}
      <div className="md:hidden flex items-center justify-around bg-white px-1 py-1.5 border-t border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
