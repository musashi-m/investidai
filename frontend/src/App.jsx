import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import VariableIncomeView from './components/VariableIncomeView';
import FixedIncomeView from './components/FixedIncomeView';
import InvestmentCalculator from './components/InvestmentCalculator';
import TransactionsView from './components/TransactionsView';
import NewTransactionModal from './components/NewTransactionModal';
import SettingsModal from './components/SettingsModal';
import UpdateBalanceModal from './components/UpdateBalanceModal';
import { api } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Dados da carteira
  const [summary, setSummary] = useState(null);
  const [positions, setPositions] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ has_brapi_token: false, portfolio_name: 'Minha Carteira' });

  // Controle de Modais
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedFixedAsset, setSelectedFixedAsset] = useState(null);
  const [quickTxData, setQuickTxData] = useState(null);

  // Carrega todos os dados da aplicação
  const loadAllData = useCallback(async (refreshQuotes = false) => {
    try {
      if (refreshQuotes) setIsRefreshing(true);
      setConnectionError(false);
      
      const [sumRes, posRes, fixRes, txRes, setRes] = await Promise.all([
        api.getDashboard(refreshQuotes),
        api.getPositions(refreshQuotes),
        api.getFixedIncome(),
        api.getTransactions(),
        api.getSettings(),
      ]);

      setSummary(sumRes);
      setPositions(posRes);
      setFixedAssets(fixRes);
      setTransactions(txRes);
      setSettings(setRes);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setConnectionError(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Sincronização manual via Brapi
  const handleRefreshQuotes = async () => {
    try {
      setIsRefreshing(true);
      await api.refreshAllQuotes();
      await loadAllData(true);
    } catch (err) {
      console.error('Erro ao atualizar cotações:', err);
      setIsRefreshing(false);
    }
  };

  // Ação rápida vinda da tabela de renda variável (Comprar, Vender, Provento)
  const handleQuickAction = (actionType, asset) => {
    setQuickTxData({
      type: actionType,
      asset: asset
    });
    setIsNewTxModalOpen(true);
  };

  // Abrir modal de atualização de saldo da renda fixa
  const handleOpenBalanceModal = (asset) => {
    setSelectedFixedAsset(asset);
    setIsBalanceModalOpen(true);
  };

  // Excluir transação
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta operação do extrato?')) return;
    try {
      await api.deleteTransaction(id);
      await loadAllData();
    } catch (err) {
      alert('Erro ao excluir transação: ' + err.message);
    }
  };

  // Salvar resultado da simulação como novo ativo de renda fixa
  const handleSaveSimulationAsAsset = (simData) => {
    setQuickTxData({
      type: 'FIXED_SIMULATION',
      ...simData
    });
    setIsNewTxModalOpen(true);
  };

  // Excluir ativo de renda fixa
  const handleDeleteFixedAsset = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este título de renda fixa?')) return;
    try {
      await api.deleteFixedIncome(id);
      await loadAllData();
    } catch (err) {
      alert('Erro ao excluir título: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Barra de Navegação */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onRefreshQuotes={handleRefreshQuotes}
        isRefreshing={isRefreshing}
        onOpenNewTransaction={() => {
          setQuickTxData(null);
          setIsNewTxModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        hasBrapiToken={settings.has_brapi_token}
        portfolioName={settings.portfolio_name}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {connectionError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-300">
            <div>
              <div className="font-bold text-rose-200 text-sm">Erro ao carregar dados locais</div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Ocorreu uma instabilidade ao ler as operações do seu navegador.
              </p>
            </div>
            <button
              onClick={() => loadAllData()}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold rounded-xl transition flex-shrink-0"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            positions={positions}
            fixedAssets={fixedAssets}
            loading={loading}
            onOpenNewTransaction={() => {
              setQuickTxData(null);
              setIsNewTxModalOpen(true);
            }}
            onQuickAction={handleQuickAction}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            hasBrapiToken={settings.has_brapi_token}
          />
        )}

        {currentTab === 'variable' && (
          <VariableIncomeView
            positions={positions}
            loading={loading}
            onRefresh={handleRefreshQuotes}
            onQuickAction={handleQuickAction}
          />
        )}

        {currentTab === 'fixed' && (
          <FixedIncomeView
            assets={fixedAssets}
            loading={loading}
            onOpenNewFixedIncome={() => {
              setQuickTxData(null);
              setIsNewTxModalOpen(true);
            }}
            onUpdateBalance={handleOpenBalanceModal}
            onDeleteAsset={handleDeleteFixedAsset}
          />
        )}

        {currentTab === 'calculator' && (
          <InvestmentCalculator
            marketIndicators={summary?.market_indicators}
            onSaveAsAsset={handleSaveSimulationAsAsset}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            loading={loading}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenNewTransaction={() => {
              setQuickTxData(null);
              setIsNewTxModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Rodapé Informativo */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-slate-500 mb-12 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Investidor10 Style</span>
            <span>•</span>
            <span>Cotações em tempo real via <a href="https://brapi.dev" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">brapi.dev</a></span>
          </div>
          <div className="text-slate-500 font-medium">
            Armazenamento seguro em LocalStorage • Renda Fixa & B3
          </div>
        </div>
      </footer>

      {/* Modais */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => {
          setIsNewTxModalOpen(false);
          setQuickTxData(null);
        }}
        onSuccess={() => loadAllData(true)}
        initialData={quickTxData}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsUpdated={() => loadAllData(true)}
      />

      <UpdateBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setSelectedFixedAsset(null);
        }}
        asset={selectedFixedAsset}
        onSuccess={() => loadAllData(false)}
      />

    </div>
  );
}
