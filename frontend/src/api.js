import { storage } from './services/storage';
import { portfolioService } from './services/portfolioService';
import { marketService } from './services/marketService';

export const api = {
  // Dashboard e Posições
  getDashboard: (refresh = false) => portfolioService.getDashboardSummary(refresh),
  getPositions: (refresh = false) => portfolioService.getVariablePositions(refresh),
  
  // Renda Fixa
  getFixedIncome: () => portfolioService.getFixedIncomePositions(),
  createFixedIncome: (data) => Promise.resolve(storage.saveFixedIncome(data)),
  updateFixedIncome: (id, data) => Promise.resolve(storage.updateFixedIncome(id, data)),
  updateBalance: (id, current_amount) => Promise.resolve(storage.updateFixedIncome(id, { current_amount })),
  deleteFixedIncome: (id) => Promise.resolve(storage.deleteFixedIncome(id)),
  
  // Transações
  getTransactions: (filters = {}) => {
    let list = storage.getTransactions();
    if (filters.category) list = list.filter(t => t.category === filters.category);
    if (filters.type) list = list.filter(t => t.type === filters.type);
    if (filters.asset_type) list = list.filter(t => t.asset_type === filters.asset_type);
    if (filters.ticker) {
      const q = filters.ticker.toLowerCase();
      list = list.filter(t => (t.ticker_or_name || '').toLowerCase().includes(q));
    }
    return Promise.resolve(list);
  },
  createTransaction: (data) => Promise.resolve(storage.saveTransaction(data)),
  deleteTransaction: (id) => Promise.resolve(storage.deleteTransaction(id)),
  
  // Mercado e Brapi
  getQuote: async (ticker, refresh = false) => {
    const quotes = await marketService.fetchQuotes([ticker], refresh);
    return quotes[ticker.toUpperCase()] || { symbol: ticker.toUpperCase(), regular_market_price: 0 };
  },
  refreshAllQuotes: async () => {
    const txs = storage.getTransactions().filter(t => t.category === 'RENDA_VARIAVEL');
    const tickers = [...new Set(txs.map(t => (t.ticker_or_name || '').toUpperCase()).filter(Boolean))];
    if (tickers.length) {
      await marketService.fetchQuotes(tickers, true);
    }
    return { success: true };
  },
  searchTickers: (query) => Promise.resolve(marketService.searchTickers(query)),
  getIndicators: () => marketService.getIndicators(),
  
  // Configurações e Backup
  getSettings: () => Promise.resolve(storage.getSettings()),
  updateSettings: (data) => Promise.resolve(storage.saveSettings(data)),
  clearAllData: () => Promise.resolve(storage.clearAll()),
  exportBackup: () => storage.exportBackup(),
  importBackup: (json) => Promise.resolve(storage.importBackup(json)),
  getBackupUrl: () => '#'
};

// Formatadores utilitários
export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercent(value, showPlus = true) {
  if (value === undefined || value === null || isNaN(value)) return "0,00%";
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  if (showPlus && value > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split("-");
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}
