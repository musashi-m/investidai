import React, { useState } from 'react';
import { 
  PiggyBank, 
  DollarSign, 
  Coins, 
  Info, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  ArrowDown, 
  Pencil, 
  MoreHorizontal, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal, 
  Layers,
  ArrowUpRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { formatCurrency, formatPercent } from '../api';

const DONUT_COLORS = [
  '#0284c7', // Sky Blue
  '#38bdf8', // Light Blue
  '#22d3ee', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
];

export default function DashboardView({ 
  summary, 
  positions = [], 
  fixedAssets = [], 
  loading, 
  onOpenNewTransaction,
  onQuickAction,
  onOpenSettings,
  hasBrapiToken
}) {
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [timeFilter, setTimeFilter] = useState('12m');

  const toggleCategory = (cat) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const {
    total_portfolio_value = 0,
    total_invested = 0,
    total_profit = 0,
    total_profit_percent = 0,
    day_pnl = 0,
    day_pnl_percent = 0,
    total_dividends = 0,
    allocation_by_category = [],
  } = summary || {};

  const capitalGain = Math.max(0, total_profit - total_dividends);
  const hasRealData = (positions && positions.length > 0) || (fixedAssets && fixedAssets.length > 0) || total_invested > 0;

  // Formatação para gráfico de Donut (Ativos na Carteira) - SOMENTE DADOS REAIS
  const donutData = hasRealData && allocation_by_category.length > 0
    ? allocation_by_category.map((item, idx) => ({
        name: item.label,
        value: item.value,
        percent: item.percent,
        color: DONUT_COLORS[idx % DONUT_COLORS.length]
      }))
    : [];

  // Dados para o gráfico de barras "Evolução do Patrimônio" - SOMENTE DADOS REAIS
  const evolutionData = hasRealData ? [
    { 
      month: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }), 
      invested: Math.round(total_invested), 
      profit: Math.round(capitalGain) 
    }
  ] : [];

  // Agrupamento dos ativos por tipo (Ações, FIIs, Renda Fixa, etc.)
  const groupedAssets = {
    ACAO: {
      name: 'Ações',
      code: 'S',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      items: positions.filter(p => p.asset_type === 'ACAO'),
    },
    FII: {
      name: 'Fundos Imobiliários',
      code: 'F',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      items: positions.filter(p => p.asset_type === 'FII'),
    },
    RENDA_FIXA: {
      name: 'Renda Fixa',
      code: 'RF',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      items: fixedAssets.map(f => ({
        ticker: f.name,
        name: f.issuer,
        quantity: 1,
        average_price: f.initial_amount,
        current_price: f.current_amount,
        day_change_percent: f.daily_yield_percent || 0.05,
        unrealized_pnl: f.gross_profit || f.profit,
        unrealized_pnl_percent: f.gross_profit_percent || f.profit_percent,
        current_value: f.current_amount,
        invested_amount: f.initial_amount,
        logo_url: null,
        isFixed: true,
        fixedData: f
      })),
    },
    OUTRO: {
      name: 'Outros (BDRs, ETFs, Criptos)',
      code: 'O',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      items: positions.filter(p => !['ACAO', 'FII'].includes(p.asset_type)),
    }
  };

  const totalAssetsCount = positions.length + fixedAssets.length;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. TOP CARDS (Estilo Investidor10) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Patrimônio total */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-full bg-slate-100 text-slate-700">
                <PiggyBank className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Patrimônio total</span>
            </div>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(total_portfolio_value)}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded">
              {formatPercent(total_profit_percent, false)}%
              <ArrowUp className="w-3 h-3 ml-0.5 fill-current" />
            </span>
          </div>

          <div className="mt-3 text-xs">
            <span className="text-slate-400 block text-[11px]">Valor investido</span>
            <span className="font-bold text-slate-700 text-sm mt-0.5 block">
              {formatCurrency(total_invested)}
            </span>
          </div>

          {/* Dots no rodapé */}
          <div className="flex justify-center space-x-1 mt-4 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          </div>
        </div>

        {/* Card 2: Lucro total */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-full bg-slate-100 text-slate-700">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Lucro total</span>
            </div>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          <div className="mt-1">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(total_profit)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-1 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Ganho de Capital</span>
              <span className="font-bold text-slate-700 text-sm mt-0.5 block">
                {formatCurrency(capitalGain)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Dividendos Recebidos</span>
              <span className="font-bold text-slate-700 text-sm mt-0.5 block">
                {formatCurrency(total_dividends)}
              </span>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center space-x-1 mt-4 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          </div>
        </div>

        {/* Card 3: Proventos Recebidos (12M) */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-full bg-slate-100 text-slate-700">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Proventos Recebidos (12M)</span>
            </div>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          <div className="mt-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(total_dividends)}
            </span>
          </div>

          <div className="mt-3 text-xs">
            <span className="text-slate-400 block text-[11px]">Total</span>
            <span className="font-bold text-slate-700 text-sm mt-0.5 block">
              {formatCurrency(total_dividends)}
            </span>
          </div>

          {/* Dots */}
          <div className="flex justify-center space-x-1 mt-4 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          </div>
        </div>

      </div>

      {/* 2. GRÁFICOS: EVOLUÇÃO DO PATRIMÔNIO & ATIVOS NA CARTEIRA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Gráfico 1: Evolução do Patrimônio (Barras Empilhadas) */}
        <div className="lg:col-span-7 bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="font-extrabold text-slate-800 text-base">Evolução do Patrimônio</h3>
            
            {/* Filtros no canto superior estilo Investidor10 */}
            <div className="flex items-center space-x-2 text-xs">
              <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-slate-700 font-medium shadow-2xs hover:bg-slate-50 transition">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Últimos 12 Meses</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-slate-700 font-medium shadow-2xs hover:bg-slate-50 transition">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Todos os tipos</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center space-x-5 text-xs text-slate-600 mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#10b981]"></span>
              <span className="font-medium">Valor aplicado</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#6ee7b7]"></span>
              <span className="font-medium">Ganho de Capital</span>
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-56 sm:h-64">
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(val) => `R$ ${val}`}
                    width={50}
                  />
                  <RechartsTooltip 
                    formatter={(val, name) => [formatCurrency(val), name === 'invested' ? 'Valor aplicado' : 'Ganho de Capital']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="invested" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="profit" stackId="a" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-gray-200">
                <PiggyBank className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="font-bold text-slate-700 text-sm">Nenhum dado de evolução ainda</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Adicione seus investimentos reais para visualizar a evolução patrimonial e valorização mês a mês.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ativos na Carteira (Donut em tons de azul) */}
        <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-base">Ativos na Carteira</h3>
              <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-700 font-medium shadow-2xs hover:bg-slate-50 transition">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Todos os tipos</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {donutData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-56 sm:h-64">
                <div className="w-44 h-44 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val) => [typeof val === 'number' && val > 100 ? formatCurrency(val) : `${val}%`, 'Participação']}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda na lateral direita */}
                <div className="space-y-2.5 text-xs w-full sm:w-auto">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-xs flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                        <span className="font-medium text-slate-700">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 ml-2">{d.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-gray-200">
                <Coins className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="font-bold text-slate-700 text-sm">Nenhum ativo alocado</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  A divisão proporcional de Ações, FIIs e Renda Fixa aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. SEÇÃO MEUS ATIVOS (Tabela completa Investidor10) */}
      <div className="space-y-4">
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Meus Ativos <span className="text-slate-400 text-sm font-semibold">({totalAssetsCount})</span>
          </h2>
        </div>

        {totalAssetsCount === 0 && (
          <div className="bg-white border border-gray-200/80 rounded-2xl p-10 text-center shadow-xs">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h4 className="text-slate-900 font-bold text-base">Sua carteira está vazia</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              Nenhum ativo fictício exibido. Cadastre suas compras reais de Ações, Fundos Imobiliários ou títulos de Renda Fixa para começar o acompanhamento.
            </p>
            <button
              onClick={onOpenNewTransaction}
              className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              + Adicionar Meu Primeiro Ativo
            </button>
          </div>
        )}

        {/* Itera sobre cada classe de ativo */}
        {Object.entries(groupedAssets).map(([catKey, cat]) => {
          if (!cat.items || cat.items.length === 0) return null;

          const isCollapsed = collapsedCategories[catKey];
          const totalCatValue = cat.items.reduce((acc, i) => acc + (i.current_value || 0), 0);
          const totalCatInvested = cat.items.reduce((acc, i) => acc + (i.invested_amount || 0), 0);
          const catPnl = totalCatValue - totalCatInvested;
          const catPnlPercent = totalCatInvested > 0 ? (catPnl / totalCatInvested) * 100 : 0;
          const catDayChangePercent = cat.items.reduce((acc, i) => acc + (i.day_change_percent || 0), 0) / cat.items.length;
          const catPercentPortfolio = total_portfolio_value > 0 ? (totalCatValue / total_portfolio_value) * 100 : 0;

          return (
            <div key={catKey} className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs">
              
              {/* Accordion Header */}
              <div 
                onClick={() => toggleCategory(catKey)}
                className="flex items-center justify-between px-5 py-3.5 bg-slate-50/70 border-b border-gray-200/80 cursor-pointer select-none hover:bg-slate-100/60 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${cat.badgeColor}`}>
                    {cat.code}
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">{cat.name}</span>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-8 text-xs">
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ativos</span>
                    <span className="font-bold text-slate-800">{cat.items.length}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor total</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{formatCurrency(totalCatValue)}</span>
                  </div>
                  <div className="hidden md:block text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Variação</span>
                    <span className={`font-bold flex items-center justify-end ${catDayChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatPercent(catDayChangePercent)}
                      {catDayChangePercent >= 0 ? <ArrowUp className="w-3 h-3 ml-0.5" /> : <ArrowDown className="w-3 h-3 ml-0.5" />}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rentabilidade</span>
                    <span className={`font-bold ${catPnlPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatPercent(catPnlPercent)} ↗
                    </span>
                  </div>
                  <div className="hidden lg:block text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">% na carteira</span>
                    <span className="font-semibold text-slate-700">⏱ {catPercentPortfolio.toFixed(0)}% / 50%</span>
                  </div>
                  <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tabela de Ativos da Categoria */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/40 text-[11px] font-semibold text-slate-400 border-b border-gray-100">
                        <th className="py-2.5 px-4 font-semibold">Ativo</th>
                        <th className="py-2.5 px-3 text-right">Quant.</th>
                        <th className="py-2.5 px-3 text-right">Preço Médio</th>
                        <th className="py-2.5 px-3 text-right">Preço Atual</th>
                        <th className="py-2.5 px-3 text-right">Variação</th>
                        <th className="py-2.5 px-3 text-center">Rentabilidade</th>
                        <th className="py-2.5 px-3 text-right">Saldo</th>
                        <th className="py-2.5 px-2 text-center">Nota</th>
                        <th className="py-2.5 px-3 text-right">% Carteira</th>
                        <th className="py-2.5 px-3 text-right">% Ideal</th>
                        <th className="py-2.5 px-3 text-center">Comprar?</th>
                        <th className="py-2.5 px-3 text-center">Opções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-slate-700">
                      {cat.items.map((item, i) => {
                        const isDayPositive = item.day_change_percent >= 0;
                        const isPnlPositive = item.unrealized_pnl >= 0;
                        const percentOfPortfolio = total_portfolio_value > 0 ? (item.current_value / total_portfolio_value) * 100 : 0;

                        return (
                          <tr key={item.ticker + i} className="hover:bg-blue-50/30 transition">
                            
                            {/* Ativo (Logo + Ticker) */}
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              <div className="flex items-center space-x-2.5">
                                {item.logo_url ? (
                                  <img 
                                    src={item.logo_url} 
                                    alt="" 
                                    className="w-7 h-7 rounded-lg bg-slate-100 p-0.5 object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                    {item.ticker.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <span className="block font-bold text-slate-900">{item.ticker}</span>
                                  {item.name && <span className="text-[10px] text-slate-400 font-normal block truncate max-w-[120px]">{item.name}</span>}
                                </div>
                              </div>
                            </td>

                            {/* Quantidade */}
                            <td className="py-3 px-3 text-right font-medium text-slate-800">
                              {item.quantity}
                            </td>

                            {/* Preço Médio (com lápis) */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center space-x-1 font-medium text-slate-700">
                                <span>{formatCurrency(item.average_price)}</span>
                                <Pencil className="w-3 h-3 text-slate-400 hover:text-blue-600 cursor-pointer" />
                              </div>
                            </td>

                            {/* Preço Atual */}
                            <td className="py-3 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.current_price)}
                            </td>

                            {/* Variação Hoje */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                isDayPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}>
                                {formatPercent(item.day_change_percent, false)}%
                                {isDayPositive ? <ArrowUp className="w-2.5 h-2.5 ml-0.5" /> : <ArrowDown className="w-2.5 h-2.5 ml-0.5" />}
                              </span>
                            </td>

                            {/* Rentabilidade Total */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isPnlPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {formatPercent(item.unrealized_pnl_percent)}
                              </span>
                            </td>

                            {/* Saldo Atual */}
                            <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.current_value)}
                            </td>

                            {/* Nota Investidor10 (Badge escura) */}
                            <td className="py-3 px-2 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white font-extrabold text-[11px]">
                                10
                              </span>
                            </td>

                            {/* % Carteira */}
                            <td className="py-3 px-3 text-right font-medium text-slate-700">
                              {percentOfPortfolio.toFixed(2)}%
                            </td>

                            {/* % Ideal */}
                            <td className="py-3 px-3 text-right font-medium text-slate-400">
                              {(100 / Math.max(1, totalAssetsCount)).toFixed(2)}%
                            </td>

                            {/* Comprar? (Pill Sim / Não) */}
                            <td className="py-3 px-3 text-center">
                              {percentOfPortfolio <= (100 / Math.max(1, totalAssetsCount)) ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Sim</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Não</span>
                                </span>
                              )}
                            </td>

                            {/* Opções (...) */}
                            <td className="py-3 px-3 text-center">
                              <button 
                                onClick={() => !item.isFixed && onQuickAction('COMPRA', item)}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          );
        })}

        {totalAssetsCount === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-extrabold text-slate-800 text-base">Sua carteira está vazia</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Adicione suas ações, fundos imobiliários ou renda fixa para visualizar o painel idêntico ao Investidor10.
            </p>
            <button
              onClick={onOpenNewTransaction}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              + Adicionar Primeiro Lançamento
            </button>
          </div>
        )}

      </div>

      {/* 4. BARRA FLUTUANTE DE AÇÕES (Floating Bottom Bar igual ao Investidor10) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-600">
            <button 
              onClick={onOpenNewTransaction} 
              className="hidden sm:flex items-center space-x-1.5 hover:text-blue-600 transition"
            >
              <span>Lançamentos</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
            <button className="hidden sm:flex items-center space-x-1.5 hover:text-blue-600 transition">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Gráficos</span>
            </button>
            <button className="hidden sm:flex items-center space-x-1.5 hover:text-blue-600 transition">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar colunas</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={onOpenNewTransaction}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>Adicionar Lançamento</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
