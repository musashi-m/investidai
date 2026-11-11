import { storage } from './storage';

export const POPULAR_TICKERS = [
  { symbol: 'PETR4', name: 'Petrobras PN', type: 'ACAO' },
  { symbol: 'PETR3', name: 'Petrobras ON', type: 'ACAO' },
  { symbol: 'VALE3', name: 'Vale S.A.', type: 'ACAO' },
  { symbol: 'ITUB4', name: 'Itaú Unibanco PN', type: 'ACAO' },
  { symbol: 'BBDC4', name: 'Bradesco PN', type: 'ACAO' },
  { symbol: 'BBAS3', name: 'Banco do Brasil ON', type: 'ACAO' },
  { symbol: 'WEGE3', name: 'WEG ON', type: 'ACAO' },
  { symbol: 'ABEV3', name: 'Ambev S.A.', type: 'ACAO' },
  { symbol: 'RENT3', name: 'Localiza Rent a Car', type: 'ACAO' },
  { symbol: 'MGLU3', name: 'Magazine Luiza ON', type: 'ACAO' },
  { symbol: 'TAEE11', name: 'Taesa Unit', type: 'ACAO' },
  { symbol: 'MXRF11', name: 'Maxi Renda FII', type: 'FII' },
  { symbol: 'HGLG11', name: 'CSHG Logística FII', type: 'FII' },
  { symbol: 'XPLG11', name: 'XP Log FII', type: 'FII' },
  { symbol: 'KNIP11', name: 'Kinea Rendimentos Imob.', type: 'FII' },
  { symbol: 'KNCR11', name: 'Kinea Rendimentos Imob.', type: 'FII' },
  { symbol: 'CPTS11', name: 'Capitânia Securities FII', type: 'FII' },
  { symbol: 'VISC11', name: 'Vinci Shopping Centers FII', type: 'FII' },
  { symbol: 'XPML11', name: 'XP Malls FII', type: 'FII' },
  { symbol: 'IVVB11', name: 'iShares S&P 500 ETF', type: 'ETF' },
  { symbol: 'BOVA11', name: 'iShares Ibovespa ETF', type: 'ETF' },
  { symbol: 'SMAL11', name: 'iShares Small Cap ETF', type: 'ETF' },
  { symbol: 'AAPL34', name: 'Apple Inc. BDR', type: 'BDR' },
  { symbol: 'MSFT34', name: 'Microsoft Corp. BDR', type: 'BDR' },
  { symbol: 'NVDC34', name: 'NVIDIA Corp. BDR', type: 'BDR' },
  { symbol: 'AMZO34', name: 'Amazon.com BDR', type: 'BDR' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRIPTO' },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRIPTO' },
  { symbol: 'SOL', name: 'Solana', type: 'CRIPTO' },
];

export const marketService = {
  // Busca cotações na Brapi
  fetchQuotes: async (symbols, force = false) => {
    const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!cleanSymbols.length) return {};

    const settings = storage.getSettings();
    const token = (settings.brapi_token || '').trim();
    const cache = storage.getMarketCache();
    const now = Date.now();
    const cacheMinutes = settings.auto_refresh_minutes || 2;
    const cacheMaxAgeMs = Math.max(30, cacheMinutes * 60) * 1000;

    const results = {};
    const missing = [];

    // 1. Verifica cache local no localStorage
    for (const sym of cleanSymbols) {
      const cached = cache[sym];
      if (cached && !force && (now - (cached._timestamp || 0)) < cacheMaxAgeMs) {
        results[sym] = cached;
      } else {
        missing.push(sym);
      }
    }

    if (!missing.length) return results;

    // 2. Consulta a Brapi diretamente pelo navegador
    try {
      const query = missing.join(',');
      let url = `https://brapi.dev/api/quote/${encodeURIComponent(query)}`;
      if (token) url += `?token=${encodeURIComponent(token)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const quoteList = data.results || [];
        const cacheUpdates = {};

        for (const q of quoteList) {
          const sym = (q.symbol || '').toUpperCase();
          if (!sym) continue;
          const item = {
            symbol: sym,
            short_name: q.shortName || sym,
            long_name: q.longName || sym,
            currency: q.currency || 'BRL',
            regular_market_price: q.regularMarketPrice || 0.0,
            regular_market_change: q.regularMarketChange || 0.0,
            regular_market_change_percent: q.regularMarketChangePercent || 0.0,
            regular_market_day_high: q.regularMarketDayHigh || 0.0,
            regular_market_day_low: q.regularMarketDayLow || 0.0,
            regular_market_previous_close: q.regularMarketPreviousClose || 0.0,
            regular_market_volume: q.regularMarketVolume || 0,
            market_cap: q.marketCap || 0,
            logo_url: q.logourl || `https://icons.brapi.dev/icons/${sym}.svg`,
            last_updated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            _timestamp: now
          };
          results[sym] = item;
          cacheUpdates[sym] = item;
        }

        storage.saveMarketCache(cacheUpdates);
      } else {
        console.warn(`Brapi retornou status ${res.status}`);
        // Fallback para cache antigo se existir
        for (const s of missing) {
          if (cache[s]) results[s] = cache[s];
        }
      }
    } catch (err) {
      console.warn('Falha na requisição da Brapi, usando cache local:', err);
      for (const s of missing) {
        if (cache[s]) results[s] = cache[s];
      }
    }

    return results;
  },

  // Indicadores de Mercado (Selic, CDI, IPCA, Dólar, IBOV)
  getIndicators: async () => {
    const indicators = {
      selic: { value: 13.75, period: 'a.a.', label: 'Taxa Selic' },
      cdi: { value: 13.65, period: 'a.a.', label: 'CDI Atual' },
      ipca: { value: 4.58, period: '12m', label: 'IPCA (12 meses)' },
      ibov: { value: 128500.0, change_percent: 0.0, label: 'IBOVESPA' },
      dolar: { value: 5.45, change_percent: 0.0, label: 'Dólar Comercial' }
    };

    // 1. Banco Central - Selic Meta
    try {
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const val = parseFloat(data[0].valor);
          indicators.selic.value = val;
          indicators.cdi.value = Math.round((val - 0.10) * 100) / 100;
        }
      }
    } catch (err) {
      // mantém padrão
    }

    // 2. Banco Central - IPCA 12m
    try {
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          indicators.ipca.value = parseFloat(data[0].valor);
        }
      }
    } catch (err) {
      // mantém padrão
    }

    return indicators;
  },

  searchTickers: (query) => {
    const q = (query || '').trim().toUpperCase();
    if (!q) return [];
    return POPULAR_TICKERS.filter(t => t.symbol.includes(q) || t.name.toUpperCase().includes(q)).slice(0, 8);
  }
};

