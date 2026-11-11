import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  PiggyBank, 
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../api';

const ASSET_TYPE_BADGES = {
  ACAO: { label: 'Ação', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  FII: { label: 'FII', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  BDR: { label: 'BDR', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ETF: { label: 'ETF', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  CRIPTO: { label: 'Cripto', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  OUTRO: { label: 'Outro', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export default function VariableIncomeView({ 
  positions = [], 
  loading, 
  onRefresh, 
  onQuickAction 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch = 
      pos.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pos.name && pos.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'ALL' || pos.asset_type.toUpperCase() === selectedType;
    return matchesSearch && matchesType;
  });

  // Totais da tabela filtrada
  const totalInvested = filteredPositions.reduce((acc, p) => acc + p.invested_amount, 0);
  const totalCurrent = filteredPositions.reduce((acc, p) => acc + p.current_value, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalDividends = filteredPositions.reduce((acc, p) => acc + p.dividends_received, 0);
  const totalDayPnl = filteredPositions.reduce((acc, p) => acc + p.day_pnl, 0);

  const categories = [
    { id: 'ALL', label: 'Todos' },
    { id: 'ACAO', label: 'Ações' },
    { id: 'FII', label: 'FIIs' },
    { id: 'BDR', label: 'BDRs' },
    { id: 'ETF', label: 'ETFs' },
    { id: 'CRIPTO', label: 'Criptos' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Resumo Rápido Superior */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div>
          <span className="text-xs text-slate-400">Total Investido</span>
          <div className="text-base sm:text-lg font-bold text-white mt-0.5">{formatCurrency(totalInvested)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-400">Saldo Atual (Mercado)</span>
          <div className="text-base sm:text-lg font-bold text-white mt-0.5">{formatCurrency(totalCurrent)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-400">Lucro / Prejuízo</span>
          <div className={`text-base sm:text-lg font-bold mt-0.5 flex items-baseline space-x-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{formatCurrency(totalPnl)}</span>
            <span className="text-xs font-semibold">({formatPercent(totalPnlPercent)})</span>
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-400">Variação Hoje</span>
          <div className={`text-base sm:text-lg font-bold mt-0.5 ${totalDayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalDayPnl)}
          </div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400">Proventos Recebidos</span>
          <div className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">{formatCurrency(totalDividends)}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código ou empresa (PETR4, MXRF11...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Botões de Categorias */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedType === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Ativos Variáveis */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ativo</th>
                <th className="py-3.5 px-3">Tipo</th>
                <th className="py-3.5 px-3 text-right">Qtd</th>
                <th className="py-3.5 px-3 text-right">Preço Médio</th>
                <th className="py-3.5 px-3 text-right">Cotação Atual</th>
                <th className="py-3.5 px-3 text-right">Var. Hoje</th>
                <th className="py-3.5 px-3 text-right">Total Investido</th>
                <th className="py-3.5 px-3 text-right">Saldo Atual</th>
                <th className="py-3.5 px-4 text-right">Lucro/Prejuízo</th>
                <th className="py-3.5 px-3 text-right">Proventos</th>
                <th className="py-3.5 px-4 text-center">Operações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Nenhum ativo de renda variável encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const isPnlPositive = pos.unrealized_pnl >= 0;
                  const isDayPositive = pos.day_change >= 0;
                  const badge = ASSET_TYPE_BADGES[pos.asset_type.toUpperCase()] || ASSET_TYPE_BADGES.OUTRO;

                  return (
                    <tr key={pos.ticker} className="hover:bg-slate-800/30 transition">
                      
                      {/* Ativo e Logo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {pos.logo_url ? (
                            <img 
                              src={pos.logo_url} 
                              alt="" 
                              className="w-7 h-7 rounded-full bg-slate-800 p-0.5 object-contain flex-shrink-0" 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {pos.ticker.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <span>{pos.ticker}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[130px]" title={pos.name}>
                              {pos.name || pos.ticker}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Badge Tipo */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Quantidade */}
                      <td className="py-3 px-3 text-right font-medium text-slate-200">
                        {pos.quantity.toLocaleString('pt-BR')}
                      </td>

                      {/* Preço Médio */}
                      <td className="py-3 px-3 text-right font-medium text-slate-300">
                        {formatCurrency(pos.average_price)}
                      </td>

                      {/* Cotação Atual (Brapi) */}
                      <td className="py-3 px-3 text-right font-bold text-white">
                        <div>{formatCurrency(pos.current_price)}</div>
                        {pos.last_updated && (
                          <div className="text-[9px] text-slate-500 flex items-center justify-end space-x-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{pos.last_updated.split(' ')[1] || ''}</span>
                          </div>
                        )}
                      </td>

                      {/* Variação Hoje */}
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                          isDayPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {isDayPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                          {formatPercent(pos.day_change_percent)}
                        </span>
                      </td>

                      {/* Total Investido */}
                      <td className="py-3 px-3 text-right font-medium text-slate-300">
                        {formatCurrency(pos.invested_amount)}
                      </td>

                      {/* Saldo Atual */}
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {formatCurrency(pos.current_value)}
                      </td>

                      {/* Lucro / Prejuízo */}
                      <td className="py-3 px-4 text-right">
                        <div className={`font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(pos.unrealized_pnl)}
                        </div>
                        <div className={`text-[11px] font-semibold ${isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatPercent(pos.unrealized_pnl_percent)}
                        </div>
                      </td>

                      {/* Proventos Recebidos */}
                      <td className="py-3 px-3 text-right font-semibold text-amber-400">
                        {formatCurrency(pos.dividends_received)}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onQuickAction('COMPRA', pos)}
                            title="Comprar mais"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onQuickAction('VENDA', pos)}
                            title="Vender cotas"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onQuickAction('PROVENTO', pos)}
                            title="Registrar dividendo/rendimento"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition"
                          >
                            <PiggyBank className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

