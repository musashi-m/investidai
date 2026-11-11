import { storage } from './storage';
import { marketService } from './marketService';
import { calculateFixedIncomePosition } from './fixedIncomeCalc';

export const portfolioService = {
  // Posições de Renda Variável
  getVariablePositions: async (forceRefresh = false) => {
    const transactions = storage.getTransactions().filter(t => t.category === 'RENDA_VARIAVEL');
    const dividends = storage.getDividends();

    // Soma proventos por ticker
    const dividendsByTicker = {};
    for (const d of dividends) {
      const sym = (d.ticker || '').toUpperCase();
      dividendsByTicker[sym] = (dividendsByTicker[sym] || 0) + (parseFloat(d.total_amount) || 0);
    }

    // Ordena transações cronologicamente
    const sortedTx = [...transactions].sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.id || 0) - (b.id || 0);
    });

    const tickersData = {};

    for (const tx of sortedTx) {
      const ticker = (tx.ticker_or_name || '').trim().toUpperCase();
      const type = (tx.type || '').toUpperCase();
      const qty = parseFloat(tx.quantity) || 0;
      const price = parseFloat(tx.unit_price) || 0;
      const fees = parseFloat(tx.fees) || 0;

      if (!tickersData[ticker]) {
        tickersData[ticker] = {
          ticker,
          asset_type: tx.asset_type || 'ACAO',
          quantity: 0,
          total_cost: 0,
          average_price: 0,
          realized_pnl: 0,
        };
      }

      const item = tickersData[ticker];

      if (type === 'COMPRA') {
        const cost = (qty * price) + fees;
        item.total_cost += cost;
        item.quantity += qty;
        if (item.quantity > 0) {
          item.average_price = item.total_cost / item.quantity;
        }
      } else if (type === 'VENDA') {
        if (item.quantity > 0) {
          const costBasis = qty * item.average_price;
          const netProceeds = (qty * price) - fees;
          const profit = netProceeds - costBasis;
          item.realized_pnl += profit;
          item.quantity -= qty;
          item.total_cost -= costBasis;
          if (item.quantity <= 0.00001) {
            item.quantity = 0;
            item.total_cost = 0;
            item.average_price = 0;
          } else {
            item.average_price = item.total_cost / item.quantity;
          }
        }
      }
    }

    const activeTickers = Object.keys(tickersData).filter(t => tickersData[t].quantity > 0);
    const quotes = activeTickers.length > 0 ? await marketService.fetchQuotes(activeTickers, forceRefresh) : {};

    const positions = [];

    for (const ticker of Object.keys(tickersData)) {
      const data = tickersData[ticker];
      if (data.quantity <= 0) continue;

      const quote = quotes[ticker] || {};
      const currentPrice = quote.regular_market_price > 0 ? quote.regular_market_price : data.average_price;
      const changePct = quote.regular_market_change_percent || 0.0;
      const changeVal = quote.regular_market_change || 0.0;
      const logoUrl = quote.logo_url || `https://icons.brapi.dev/icons/${ticker}.svg`;
      const longName = quote.long_name || quote.short_name || ticker;

      const qty = data.quantity;
      const avgPrice = data.average_price;
      const invested = qty * avgPrice;
      const currentValue = qty * currentPrice;
      const unrealizedPnl = currentValue - invested;
      const unrealizedPnlPct = avgPrice > 0 ? ((currentPrice / avgPrice) - 1.0) * 100.0 : 0.0;
      const dayPnl = qty * changeVal;
      const totalDivs = dividendsByTicker[ticker] || 0.0;
      const totalReturn = unrealizedPnl + totalDivs;
      const totalReturnPct = invested > 0 ? (totalReturn / invested) * 100.0 : 0.0;

      positions.push({
        ticker,
        name: longName,
        asset_type: data.asset_type,
        quantity: qty,
        average_price: Math.round(avgPrice * 10000) / 10000,
        current_price: Math.round(currentPrice * 10000) / 10000,
        invested_amount: Math.round(invested * 100) / 100,
        current_value: Math.round(currentValue * 100) / 100,
        unrealized_pnl: Math.round(unrealizedPnl * 100) / 100,
        unrealized_pnl_percent: Math.round(unrealizedPnlPct * 100) / 100,
        day_change: Math.round(changeVal * 10000) / 10000,
        day_change_percent: Math.round(changePct * 100) / 100,
        day_pnl: Math.round(dayPnl * 100) / 100,
        dividends_received: Math.round(totalDivs * 100) / 100,
        total_return: Math.round(totalReturn * 100) / 100,
        total_return_percent: Math.round(totalReturnPct * 100) / 100,
        realized_pnl: Math.round(data.realized_pnl * 100) / 100,
        logo_url: logoUrl,
        last_updated: quote.last_updated
      });
    }

    positions.sort((a, b) => b.current_value - a.current_value);
    return positions;
  },

  // Posições de Renda Fixa
  getFixedIncomePositions: async () => {
    const assets = storage.getFixedIncome().filter(a => a.status === 'ATIVO');
    const indicators = await marketService.getIndicators();

    const selicAnnual = indicators?.selic?.value || 13.75;
    const cdiAnnual = indicators?.cdi?.value || 13.65;
    const ipcaAnnual = indicators?.ipca?.value || 4.58;

    return assets.map(asset => {
      const calcResult = calculateFixedIncomePosition({
        initial_amount: asset.initial_amount,
        start_date: asset.start_date,
        maturity_date: asset.maturity_date,
        indexer_type: asset.indexer_type,
        indexer_rate: asset.indexer_rate,
        is_tax_free: Boolean(asset.is_tax_free),
        selic_annual: selicAnnual,
        cdi_annual: cdiAnnual,
        ipca_annual: ipcaAnnual
      });

      return {
        ...asset,
        ...calcResult,
        profit: calcResult.gross_profit,
        profit_percent: calcResult.gross_profit_percent
      };
    });
  },

  // Resumo Consolidado do Dashboard
  getDashboardSummary: async (forceRefresh = false) => {
    const varPositions = await portfolioService.getVariablePositions(forceRefresh);
    const fixedPositions = await portfolioService.getFixedIncomePositions();
    const indicators = await marketService.getIndicators();

    const varInvested = varPositions.reduce((acc, p) => acc + p.invested_amount, 0);
    const varCurrent = varPositions.reduce((acc, p) => acc + p.current_value, 0);
    const varPnl = varCurrent - varInvested;
    const varDayPnl = varPositions.reduce((acc, p) => acc + p.day_pnl, 0);
    const varRealized = varPositions.reduce((acc, p) => acc + p.realized_pnl, 0);
    const varDividends = varPositions.reduce((acc, p) => acc + p.dividends_received, 0);

    const fixedInvested = fixedPositions.reduce((acc, p) => acc + p.initial_amount, 0);
    const fixedCurrent = fixedPositions.reduce((acc, p) => acc + p.current_amount, 0);
    const fixedNetCurrent = fixedPositions.reduce((acc, p) => acc + (p.net_amount || p.current_amount), 0);
    const fixedPnl = fixedCurrent - fixedInvested;
    const fixedDayGain = fixedPositions.reduce((acc, p) => acc + (p.estimated_daily_gain || 0), 0);

    const totalInvested = varInvested + fixedInvested;
    const totalCurrent = varCurrent + fixedCurrent;
    const totalProfit = totalCurrent - totalInvested;
    const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100.0 : 0.0;
    const totalDayPnl = varDayPnl + fixedDayGain;
    const dayChangePct = totalCurrent > 0 ? (totalDayPnl / totalCurrent) * 100.0 : 0.0;

    // Alocação por Classe de Ativo
    const categories = {
      RENDA_FIXA: fixedCurrent,
      ACAO: 0,
      FII: 0,
      BDR: 0,
      ETF: 0,
      CRIPTO: 0,
      OUTRO: 0,
    };

    for (const p of varPositions) {
      const cat = (p.asset_type || 'OUTRO').toUpperCase();
      if (categories[cat] !== undefined) {
        categories[cat] += p.current_value;
      } else {
        categories.OUTRO += p.current_value;
      }
    }

    const categoryLabels = {
      RENDA_FIXA: 'Renda Fixa',
      ACAO: 'Ações',
      FII: 'Fundos Imobiliários',
      BDR: 'BDRs (Internacional)',
      ETF: 'ETFs',
      CRIPTO: 'Criptomoedas',
      OUTRO: 'Outros',
    };

    const allocationByCategory = [];
    if (totalCurrent > 0) {
      for (const [key, val] of Object.entries(categories)) {
        if (val > 0) {
          allocationByCategory.push({
            category: key,
            label: categoryLabels[key] || key,
            value: Math.round(val * 100) / 100,
            percent: Math.round((val / totalCurrent) * 10000) / 100,
          });
        }
      }
    }

    // Maiores Posições
    const topAssets = [];
    for (const p of varPositions) {
      topAssets.push({
        ticker: p.ticker,
        name: p.name,
        type: p.asset_type,
        value: p.current_value,
        percent: totalCurrent > 0 ? Math.round((p.current_value / totalCurrent) * 10000) / 100 : 0,
        pnl_percent: p.unrealized_pnl_percent,
        logo_url: p.logo_url
      });
    }
    for (const f of fixedPositions) {
      topAssets.push({
        ticker: f.name,
        name: `${f.issuer} - ${f.indexer_label}`,
        type: 'RENDA_FIXA',
        value: f.current_amount,
        percent: totalCurrent > 0 ? Math.round((f.current_amount / totalCurrent) * 10000) / 100 : 0,
        pnl_percent: f.profit_percent,
        logo_url: null
      });
    }
    topAssets.sort((a, b) => b.value - a.value);

    // Altas e Baixas
    const gainers = varPositions.filter(p => p.day_change_percent > 0).sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 5);
    const losers = varPositions.filter(p => p.day_change_percent < 0).sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 5);

    return {
      total_portfolio_value: Math.round(totalCurrent * 100) / 100,
      total_invested: Math.round(totalInvested * 100) / 100,
      total_profit: Math.round(totalProfit * 100) / 100,
      total_profit_percent: Math.round(totalProfitPct * 100) / 100,
      day_pnl: Math.round(totalDayPnl * 100) / 100,
      day_pnl_percent: Math.round(dayChangePct * 100) / 100,
      total_dividends: Math.round(varDividends * 100) / 100,
      total_realized_profit: Math.round(varRealized * 100) / 100,
      variable_income: {
        invested: Math.round(varInvested * 100) / 100,
        current: Math.round(varCurrent * 100) / 100,
        profit: Math.round(varPnl * 100) / 100,
        profit_percent: varInvested > 0 ? Math.round(((varCurrent / varInvested) - 1.0) * 10000) / 100 : 0,
        count: varPositions.length
      },
      fixed_income: {
        invested: Math.round(fixedInvested * 100) / 100,
        current: Math.round(fixedCurrent * 100) / 100,
        net_current: Math.round(fixedNetCurrent * 100) / 100,
        profit: Math.round(fixedPnl * 100) / 100,
        profit_percent: fixedInvested > 0 ? Math.round(((fixedCurrent / fixedInvested) - 1.0) * 10000) / 100 : 0,
        estimated_daily_gain: Math.round(fixedDayGain * 100) / 100,
        count: fixedPositions.length
      },
      allocation_by_category: allocationByCategory,
      top_assets: topAssets.slice(0, 8),
      gainers,
      losers,
      market_indicators: indicators
    };
  }
};

