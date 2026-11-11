import React, { useState } from 'react';
import { 
  Landmark, 
  Calendar, 
  Clock, 
  Percent, 
  ShieldCheck, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Search,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '../api';

const INDEXER_COLORS = {
  CDI: 'bg-blue-50 text-blue-700 border-blue-200',
  IPCA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PREFIXADO: 'bg-purple-50 text-purple-700 border-purple-200',
  SELIC: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export default function FixedIncomeView({ 
  assets = [], 
  loading, 
  onOpenNewFixedIncome, 
  onUpdateBalance, 
  onDeleteAsset 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndexer, setSelectedIndexer] = useState('ALL');

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndexer = selectedIndexer === 'ALL' || asset.indexer_type.toUpperCase() === selectedIndexer;
    return matchesSearch && matchesIndexer;
  });

  const totalInvested = filteredAssets.reduce((acc, a) => acc + a.initial_amount, 0);
  const totalCurrent = filteredAssets.reduce((acc, a) => acc + a.current_amount, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const indexers = [
    { id: 'ALL', label: 'Todos' },
    { id: 'CDI', label: 'CDI' },
    { id: 'IPCA', label: 'IPCA+' },
    { id: 'PREFIXADO', label: 'Prefixado' },
    { id: 'SELIC', label: 'Selic' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Resumo Renda Fixa (Investidor10 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Aplicado</span>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1">{formatCurrency(totalInvested)}</div>
        </div>
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Saldo Atual (Bruto)</span>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1">{formatCurrency(totalCurrent)}</div>
        </div>
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Rendimento Acumulado</span>
          <div className="text-base sm:text-lg font-black text-emerald-600 mt-1 flex items-baseline space-x-1">
            <span>{formatCurrency(totalProfit)}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {formatPercent(totalProfitPercent)}
            </span>
          </div>
        </div>
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Títulos em Carteira</span>
          <div className="text-base sm:text-lg font-black text-blue-600 mt-1">{filteredAssets.length} ativos</div>
        </div>
      </div>

      {/* Controles: Busca, Filtros e Botão Adicionar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, emissor ou tipo (ex: Inter, Tesouro...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 text-slate-800 placeholder:text-slate-400 text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-600 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 overflow-x-auto">
            {indexers.map((idx) => (
              <button
                key={idx.id}
                onClick={() => setSelectedIndexer(idx.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedIndexer === idx.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-gray-200'
                }`}
              >
                {idx.label}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenNewFixedIncome}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adicionar Renda Fixa</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards de Renda Fixa */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center shadow-xs">
          <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
          <h4 className="text-slate-900 font-bold text-base">Nenhum título de renda fixa encontrado</h4>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            Adicione seus investimentos em CDB, Tesouro Direto, LCIs, LCAs e Debêntures para acompanhar o rendimento.
          </p>
          <button
            onClick={onOpenNewFixedIncome}
            className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Cadastrar Primeiro Título
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const indexerBadge = INDEXER_COLORS[asset.indexer_type] || INDEXER_COLORS.CDI;
            return (
              <div 
                key={asset.id} 
                className="bg-white border border-gray-200/90 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition shadow-2xs"
              >
                <div>
                  
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${indexerBadge}`}>
                          {asset.indexer_label}
                        </span>
                        {asset.is_tax_free === 1 && (
                          <span className="flex items-center space-x-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Isento IR</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-2 tracking-tight">
                        {asset.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Landmark className="w-3 h-3 text-slate-400" />
                        <span>{asset.issuer}</span>
                        <span>•</span>
                        <span>{asset.asset_type}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteAsset(asset.id)}
                      title="Excluir ativo"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Informações Financeiras Dinâmicas */}
                  <div className="my-4 p-3.5 bg-slate-50/70 rounded-xl border border-gray-200/80 space-y-2.5">
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Aplicado</span>
                        <span className="text-sm font-semibold text-slate-700">
                          {formatCurrency(asset.initial_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Saldo Atual (Bruto)</span>
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(asset.current_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Rendimento Bruto vs Líquido */}
                    <div className="pt-2 border-t border-gray-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Rendimento Bruto:</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="font-bold text-emerald-600">+{formatCurrency(asset.gross_profit || asset.profit)}</span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                            {formatPercent(asset.gross_profit_percent || asset.profit_percent)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center space-x-1">
                          <span>Saldo Líquido (Est.):</span>
                          <span className="text-[10px] text-slate-400">
                            ({asset.is_tax_free ? 'Isento IR' : `IR ${asset.ir_rate}%`})
                          </span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(asset.net_amount || asset.current_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Estatísticas de Mercado Diário */}
                    <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Rendimento estimado:</span>
                      <span className="font-bold text-blue-600">
                        +{formatCurrency(asset.estimated_daily_gain || 0)} / dia útil
                      </span>
                    </div>

                    {/* Dias de Rendimento Real */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Dias úteis de rendimento:</span>
                      <span className="text-slate-700 font-semibold">
                        {asset.business_days || 0} dias úteis ({asset.calendar_days || 0} corridos)
                      </span>
                    </div>

                  </div>

                  {/* Vencimento e Progresso */}
                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Aplicação: {formatDate(asset.start_date)}</span>
                      </span>
                      <span className="font-medium text-slate-700">Venc: {formatDate(asset.maturity_date) || 'Liquidez Diária'}</span>
                    </div>

                    {asset.maturity_date && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${asset.progress_percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{asset.progress_percent}% decorrido</span>
                          <span>{asset.days_left !== null ? `${asset.days_left} dias restantes` : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Botão de Ação Rápida */}
                <button
                  onClick={() => onUpdateBalance(asset)}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-gray-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Atualizar Saldo Atual</span>
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
