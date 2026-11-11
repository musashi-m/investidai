import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Calendar, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  PlusCircle,
  HelpCircle,
  PiggyBank
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { formatCurrency, formatPercent } from '../api';

export default function InvestmentCalculator({ 
  marketIndicators, 
  onSaveAsAsset 
}) {
  // Taxas padrão de mercado obtidas via API ou valores de referência
  const defaultCdi = marketIndicators?.cdi?.value || 13.65;
  const defaultSelic = marketIndicators?.selic?.value || 13.75;
  const defaultIpca = marketIndicators?.ipca?.value || 4.58;

  // Estados dos inputs
  const [initialAmount, setInitialAmount] = useState('5000');
  const [monthlyDeposit, setMonthlyDeposit] = useState('500');
  const [termValue, setTermValue] = useState('24');
  const [termUnit, setTermUnit] = useState('MONTHS'); // 'MONTHS' ou 'YEARS'
  const [indexerType, setIndexerType] = useState('CDI'); // 'CDI', 'SELIC', 'PREFIXADO', 'IPCA'
  const [indexerRate, setIndexerRate] = useState('110'); // ex: 110 (%) ou 13.0 (%)
  const [isTaxFree, setIsTaxFree] = useState(false); // LCI/LCA (true) vs CDB (false)
  const [showTable, setShowTable] = useState(false);

  // Conversão de prazo para meses
  const totalMonths = useMemo(() => {
    const val = parseInt(termValue) || 1;
    return termUnit === 'YEARS' ? val * 12 : val;
  }, [termValue, termUnit]);

  // Alíquota de IR regressivo com base nos dias corridos estimados (1 mês = 30.41 dias)
  const taxRate = useMemo(() => {
    if (isTaxFree) return 0.0;
    const estimatedDays = totalMonths * 30.41;
    if (estimatedDays <= 180) return 22.5;
    if (estimatedDays <= 360) return 20.0;
    if (estimatedDays <= 720) return 17.5;
    return 15.0;
  }, [isTaxFree, totalMonths]);

  // Taxa anual efetiva do produto
  const effectiveAnnualRate = useMemo(() => {
    const rateNum = parseFloat(indexerRate) || 0;
    if (indexerType === 'CDI') {
      return (defaultCdi / 100) * (rateNum / 100);
    } else if (indexerType === 'SELIC') {
      return (defaultSelic + rateNum) / 100;
    } else if (indexerType === 'PREFIXADO') {
      return rateNum / 100;
    } else if (indexerType === 'IPCA') {
      return ((1 + defaultIpca / 100) * (1 + rateNum / 100)) - 1;
    }
    return rateNum / 100;
  }, [indexerType, indexerRate, defaultCdi, defaultSelic, defaultIpca]);

  // Taxa mensal equivalente
  const monthlyRate = useMemo(() => {
    return Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  }, [effectiveAnnualRate]);

  // Taxa Poupança de referência (0.60% a.m.)
  const poupancaMonthlyRate = 0.0060;

  // Simulação mês a mês
  const simulation = useMemo(() => {
    const pInit = parseFloat(initialAmount) || 0;
    const pMonthly = parseFloat(monthlyDeposit) || 0;

    let balanceGross = pInit;
    let balancePoupanca = pInit;
    let totalDeposited = pInit;
    const history = [];

    history.push({
      month: 0,
      label: 'Início',
      invested: Math.round(totalDeposited),
      gross: Math.round(balanceGross),
      net: Math.round(balanceGross),
      poupanca: Math.round(balancePoupanca),
    });

    for (let m = 1; m <= totalMonths; m++) {
      balanceGross = (balanceGross + pMonthly) * (1 + monthlyRate);
      balancePoupanca = (balancePoupanca + pMonthly) * (1 + poupancaMonthlyRate);
      totalDeposited += pMonthly;

      const currentGain = balanceGross - totalDeposited;
      const currentTax = isTaxFree ? 0 : currentGain * (taxRate / 100);
      const currentNet = balanceGross - currentTax;

      if (m % Math.ceil(totalMonths / 12) === 0 || m === totalMonths) {
        history.push({
          month: m,
          label: `${m}m`,
          invested: Math.round(totalDeposited),
          gross: Math.round(balanceGross),
          net: Math.round(currentNet),
          poupanca: Math.round(balancePoupanca),
        });
      }
    }

    const finalGrossProfit = balanceGross - totalDeposited;
    const finalTaxAmount = isTaxFree ? 0 : finalGrossProfit * (taxRate / 100);
    const finalNet = balanceGross - finalTaxAmount;
    const finalNetProfit = finalNet - totalDeposited;
    const diffPoupanca = finalNet - balancePoupanca;

    return {
      totalInvested: totalDeposited,
      grossTotal: balanceGross,
      grossProfit: finalGrossProfit,
      taxAmount: finalTaxAmount,
      taxRate,
      netTotal: finalNet,
      netProfit: finalNetProfit,
      netProfitPercent: totalDeposited > 0 ? (finalNetProfit / totalDeposited) * 100 : 0,
      poupancaTotal: balancePoupanca,
      diffPoupanca,
      averageMonthlyGain: totalMonths > 0 ? finalNetProfit / totalMonths : 0,
      history
    };
  }, [initialAmount, monthlyDeposit, totalMonths, monthlyRate, taxRate, isTaxFree]);

  // Presets rápidos para celular
  const applyPreset = (type, rate, taxFree) => {
    setIndexerType(type);
    setIndexerRate(rate.toString());
    setIsTaxFree(taxFree);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Cabeçalho da Calculadora (Estilo Investidor10) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Simulador de Renda Fixa
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Projeção real de juros compostos, desconto regressivo de IR e comparativo com a Poupança
              </p>
            </div>
          </div>

          {/* Taxas Atuais do Mercado (Badges) */}
          <div className="flex items-center space-x-2 text-xs bg-slate-50 p-2 rounded-xl border border-gray-200 self-start sm:self-auto">
            <div className="px-2.5 py-1 rounded-lg bg-blue-100/70 text-blue-800 font-bold border border-blue-200">
              CDI: {defaultCdi}% a.a.
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 font-bold border border-emerald-200">
              Selic: {defaultSelic}% a.a.
            </div>
          </div>
        </div>
      </div>

      {/* Formulário e Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna 1: Parâmetros */}
        <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <h3 className="font-extrabold text-slate-900 text-base">
            Parâmetros da Aplicação
          </h3>

          {/* Valor Inicial */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Valor Inicial (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
              <input
                type="number"
                inputMode="decimal"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 text-slate-900 text-base font-black rounded-xl pl-10 pr-4 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 transition shadow-2xs"
                placeholder="0,00"
              />
            </div>
            {/* Chips de valores rápidos */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {['1000', '5000', '10000', '50000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInitialAmount(val)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-gray-200 transition whitespace-nowrap active:scale-95"
                >
                  +{formatCurrency(parseFloat(val)).replace(',00', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Aporte Mensal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Aporte Mensal (Opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
              <input
                type="number"
                inputMode="decimal"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 text-slate-900 text-base font-black rounded-xl pl-10 pr-4 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 transition shadow-2xs"
                placeholder="0,00"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {['0', '200', '500', '1000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonthlyDeposit(val)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-gray-200 transition whitespace-nowrap active:scale-95"
                >
                  {val === '0' ? 'Sem aporte' : `+${formatCurrency(parseFloat(val)).replace(',00', '')}/mês`}
                </button>
              ))}
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Prazo do Investimento
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={termValue}
                onChange={(e) => setTermValue(e.target.value)}
                className="w-2/3 bg-slate-50 border border-gray-300 text-slate-900 text-base font-black rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 transition shadow-2xs"
              />
              <select
                value={termUnit}
                onChange={(e) => setTermUnit(e.target.value)}
                className="w-1/3 bg-slate-50 border border-gray-300 text-slate-900 text-sm font-bold rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 transition shadow-2xs"
              >
                <option value="MONTHS">Meses</option>
                <option value="YEARS">Anos</option>
              </select>
            </div>
            {/* Prazos rápidos */}
            <div className="flex items-center gap-1.5 mt-2">
              {[
                { label: '6m', val: '6', unit: 'MONTHS' },
                { label: '1 ano', val: '12', unit: 'MONTHS' },
                { label: '2 anos', val: '24', unit: 'MONTHS' },
                { label: '5 anos', val: '5', unit: 'YEARS' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setTermValue(p.val);
                    setTermUnit(p.unit);
                  }}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 ${
                    termValue === p.val && termUnit === p.unit
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-600 border-gray-200 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Indexador e Taxa */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-bold text-slate-700 block">Tipo de Rendimento</span>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CDI', label: '% do CDI' },
                { id: 'SELIC', label: 'Tesouro Selic' },
                { id: 'PREFIXADO', label: 'Prefixado' },
                { id: 'IPCA', label: 'IPCA+ (Inflação)' },
              ].map((idx) => (
                <button
                  key={idx.id}
                  type="button"
                  onClick={() => setIndexerType(idx.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition active:scale-95 text-left flex items-center justify-between ${
                    indexerType === idx.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-gray-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{idx.label}</span>
                  {indexerType === idx.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                </button>
              ))}
            </div>

            {/* Taxa do Indexador */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {indexerType === 'CDI' ? 'Percentual do CDI (%)' : 
                 indexerType === 'SELIC' ? 'Taxa adicional além da Selic (% a.a.)' :
                 indexerType === 'PREFIXADO' ? 'Taxa Prefixada (% a.a.)' : 'Taxa Real (% a.a.) além do IPCA'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={indexerRate}
                onChange={(e) => setIndexerRate(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 text-slate-900 text-base font-black rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:border-blue-600 transition shadow-2xs"
                placeholder={indexerType === 'CDI' ? '110' : '13.0'}
              />
            </div>

            {/* Presets Populares */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Modelos comuns de mercado:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('CDI', 100, false)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-gray-200 hover:bg-slate-200 active:scale-95"
                >
                  CDB 100% CDI
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('CDI', 110, false)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-gray-200 hover:bg-slate-200 active:scale-95"
                >
                  CDB 110% CDI
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('CDI', 95, true)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95"
                >
                  LCI/LCA 95% (Isento)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('PREFIXADO', 13.5, false)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-gray-200 hover:bg-slate-200 active:scale-95"
                >
                  Prefixado 13.5%
                </button>
              </div>
            </div>

            {/* Toggle de Isenção de IR */}
            <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-gray-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isTaxFree}
                onChange={(e) => setIsTaxFree(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-gray-300"
              />
              <span className="text-xs font-bold text-slate-800">
                Isento de Imposto de Renda (LCI, LCA, CRI, CRA)
              </span>
            </label>
          </div>

        </div>

        {/* Coluna 2: Resultados e Gráficos */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card Principal: Valor Líquido Final */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Valor Líquido Final (no resgate)
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                {isTaxFree ? 'Isento de IR' : `IR ${taxRate}%`}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(simulation.netTotal)}
            </div>

            {/* Linha de Rentabilidade Líquida */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Total Investido</span>
                <span className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 block">
                  {formatCurrency(simulation.totalInvested)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Lucro Líquido Real</span>
                <span className="font-black text-emerald-600 text-sm sm:text-base mt-0.5 block">
                  +{formatCurrency(simulation.netProfit)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[11px] font-semibold">Ganho Médio Mensal</span>
                <span className="font-bold text-blue-600 text-sm sm:text-base mt-0.5 block">
                  +{formatCurrency(simulation.averageMonthlyGain)}/mês
                </span>
              </div>
            </div>
          </div>

          {/* Cards Comparativos (Grid de 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Detalhe dos Impostos e Saldo Bruto */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs shadow-2xs">
              <span className="font-extrabold text-slate-900 text-sm block">Detalhamento dos Rendimentos</span>
              
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Saldo Bruto Total:</span>
                <span className="font-bold text-slate-800">{formatCurrency(simulation.grossTotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Rendimento Bruto:</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(simulation.grossProfit)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-slate-500">Desconto de Imposto (IR):</span>
                <span className="font-bold text-rose-600">
                  {isTaxFree ? 'R$ 0,00 (Isento)' : `-${formatCurrency(simulation.taxAmount)} (${taxRate}%)`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-semibold">Rentabilidade Líquida Total:</span>
                <span className="font-black text-emerald-600">+{formatPercent(simulation.netProfitPercent)}</span>
              </div>
            </div>

            {/* Comparativo com a Poupança */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center space-x-2">
                <PiggyBank className="w-4 h-4 text-amber-700" />
                <span className="font-extrabold text-amber-900 text-sm">Comparado à Poupança</span>
              </div>

              <p className="text-amber-800 text-xs leading-relaxed">
                Na Caderneta de Poupança tradicional, você acumularia aproximadamente:
              </p>
              
              <div className="text-base font-black text-amber-950">
                {formatCurrency(simulation.poupancaTotal)}
              </div>

              <div className="p-2.5 bg-white/80 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                🎉 Você ganha <span className="text-emerald-700 font-extrabold">+{formatCurrency(simulation.diffPoupanca)}</span> a mais que a Poupança nesta aplicação!
              </div>
            </div>

          </div>

          {/* Gráfico de Evolução no Tempo */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center justify-between">
              <span>Curva de Evolução do Patrimônio</span>
              <span className="text-xs text-slate-400 font-medium">{totalMonths} meses</span>
            </h4>

            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip 
                    formatter={(val, name) => [formatCurrency(val), name === 'net' ? 'Saldo Líquido' : name === 'invested' ? 'Total Depositado' : 'Poupança']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invested" 
                    stroke="#0284c7" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorInvested)" 
                    name="invested"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorNet)" 
                    name="net"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center space-x-5 text-xs mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#0284c7]"></span>
                <span className="text-slate-600 font-medium">Total Depositado</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#10b981]"></span>
                <span className="text-slate-800 font-bold">Saldo Líquido com Juros</span>
              </div>
            </div>
          </div>

          {/* Botão de Ação: Cadastrar Ativo a Partir da Simulação */}
          {onSaveAsAsset && (
            <button
              onClick={() => onSaveAsAsset({
                initial_amount: parseFloat(initialAmount) || 0,
                indexer_type: indexerType,
                indexer_rate: parseFloat(indexerRate) || 100,
                is_tax_free: isTaxFree,
                term_months: totalMonths
              })}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 transition active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Esta Aplicação à Minha Carteira</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
