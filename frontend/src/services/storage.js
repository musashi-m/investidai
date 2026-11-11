// Gerenciamento de Armazenamento Local (LocalStorage)

const STORAGE_KEYS = {
  TRANSACTIONS: 'inv_manager_transactions',
  FIXED_INCOME: 'inv_manager_fixed_income',
  DIVIDENDS: 'inv_manager_dividends',
  SETTINGS: 'inv_manager_settings',
  MARKET_CACHE: 'inv_manager_market_cache',
};

const DEFAULT_SETTINGS = {
  brapi_token: '',
  portfolio_name: 'Minha Carteira',
  auto_refresh_minutes: 2,
};

function getItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Erro ao ler ${key} do localStorage:`, err);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao salvar ${key} no localStorage:`, err);
  }
}

export const storage = {
  // Configurações
  getSettings: () => {
    return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
  saveSettings: (settings) => {
    const current = storage.getSettings();
    const updated = { ...current, ...settings };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Transações
  getTransactions: () => {
    return getItem(STORAGE_KEYS.TRANSACTIONS, []);
  },
  saveTransaction: (tx) => {
    const list = storage.getTransactions();
    const newTx = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      ...tx
    };
    list.unshift(newTx);
    setItem(STORAGE_KEYS.TRANSACTIONS, list);

    // Se for provento, registra também na lista de proventos
    if (tx.type === 'PROVENTO') {
      storage.saveDividend({
        ticker: tx.ticker_or_name,
        dividend_type: tx.asset_type || 'PROVENTO',
        payment_date: tx.date,
        total_amount: tx.total_amount,
        notes: tx.notes
      });
    }

    return newTx;
  },
  deleteTransaction: (id) => {
    const list = storage.getTransactions().filter(t => t.id !== id);
    setItem(STORAGE_KEYS.TRANSACTIONS, list);
  },

  // Renda Fixa
  getFixedIncome: () => {
    return getItem(STORAGE_KEYS.FIXED_INCOME, []);
  },
  saveFixedIncome: (asset) => {
    const list = storage.getFixedIncome();
    const newAsset = {
      id: Date.now(),
      status: 'ATIVO',
      created_at: new Date().toISOString(),
      ...asset
    };
    list.push(newAsset);
    setItem(STORAGE_KEYS.FIXED_INCOME, list);

    // Cria aporte correspondente no extrato
    storage.saveTransaction({
      category: 'RENDA_FIXA',
      type: 'APORTE',
      asset_type: asset.asset_type,
      ticker_or_name: asset.name,
      quantity: 1,
      unit_price: asset.initial_amount,
      total_amount: asset.initial_amount,
      fees: 0,
      date: asset.start_date,
      fixed_income_id: newAsset.id,
      notes: 'Aplicação inicial'
    });

    return newAsset;
  },
  updateFixedIncome: (id, updates) => {
    const list = storage.getFixedIncome().map(a => {
      if (a.id === id) {
        return { ...a, ...updates, updated_at: new Date().toISOString() };
      }
      return a;
    });
    setItem(STORAGE_KEYS.FIXED_INCOME, list);
  },
  deleteFixedIncome: (id) => {
    const list = storage.getFixedIncome().filter(a => a.id !== id);
    setItem(STORAGE_KEYS.FIXED_INCOME, list);
    // Remove transações vinculadas
    const txs = storage.getTransactions().filter(t => t.fixed_income_id !== id);
    setItem(STORAGE_KEYS.TRANSACTIONS, txs);
  },

  // Proventos / Dividendos
  getDividends: () => {
    return getItem(STORAGE_KEYS.DIVIDENDS, []);
  },
  saveDividend: (div) => {
    const list = storage.getDividends();
    list.push({
      id: Date.now(),
      created_at: new Date().toISOString(),
      ...div
    });
    setItem(STORAGE_KEYS.DIVIDENDS, list);
  },

  // Cache de Cotações da Brapi
  getMarketCache: () => {
    return getItem(STORAGE_KEYS.MARKET_CACHE, {});
  },
  saveMarketCache: (cacheUpdates) => {
    const current = storage.getMarketCache();
    const updated = { ...current, ...cacheUpdates };
    setItem(STORAGE_KEYS.MARKET_CACHE, updated);
    return updated;
  },

  // Limpeza Geral
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.FIXED_INCOME);
    localStorage.removeItem(STORAGE_KEYS.DIVIDENDS);
    localStorage.removeItem(STORAGE_KEYS.MARKET_CACHE);
  },

  // Exportar Backup
  exportBackup: () => {
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      transactions: storage.getTransactions(),
      fixed_income_assets: storage.getFixedIncome(),
      dividends: storage.getDividends(),
      settings: storage.getSettings()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_investimentos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Importar Backup
  importBackup: (backupJson) => {
    try {
      const data = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;
      if (Array.isArray(data.transactions)) setItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (Array.isArray(data.fixed_income_assets)) setItem(STORAGE_KEYS.FIXED_INCOME, data.fixed_income_assets);
      if (Array.isArray(data.dividends)) setItem(STORAGE_KEYS.DIVIDENDS, data.dividends);
      if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);
      return true;
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      throw new Error('Arquivo de backup inválido.');
    }
  }
};

