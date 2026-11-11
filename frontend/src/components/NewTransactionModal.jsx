import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Landmark, 
  Search, 
  Sparkles, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api, formatCurrency } from '../api';

export default function NewTransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData = null 
}) {
  const [activeTab, setActiveTab] = useState('VARIABLE'); // 'VARIABLE' ou 'FIXED'
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Renda Variável Form
  const [varType, setVarType] = useState('COMPRA'); // COMPRA, VENDA, PROVENTO
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState('ACAO');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState(null);
  const [tickerSuggestions, setTickerSuggestions] = useState([]);

  // Renda Fixa Form
  const [fixedName, setFixedName] = useState('');
  const [fixedIssuer, setFixedIssuer] = useState('');
  const [fixedType, setFixedType] = useState('CDB');
  const [fixedIndexerType, setFixedIndexerType] = useState('CDI');
  const [fixedIndexerRate, setFixedIndexerRate] = useState('110');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedCurrentAmount, setFixedCurrentAmount] = useState('');
  const [fixedStartDate, setFixedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixedMaturityDate, setFixedMaturityDate] = useState('');
  const [fixedLiquidity, setFixedLiquidity] = useState('NO_VENCIMENTO');
  const [fixedIsTaxFree, setFixedIsTaxFree] = useState(false);
  const [fixedNotes, setFixedNotes] = useState('');

  // Pré-preenchimento ao abrir via atalho (quick action)
  useEffect(() => {
    if (initialData) {
      if (initialData.type === 'COMPRA' || initialData.type === 'VENDA' || initialData.type === 'PROVENTO') {
        setActiveTab('VARIABLE');
        setVarType(initialData.type);
        if (initialData.asset) {
          setTicker(initialData.asset.ticker || '');
          setAssetType(initialData.asset.asset_type || 'ACAO');
          if (initialData.asset.current_price) {
            setUnitPrice(initialData.asset.current_price.toString());
          }
        }
      } else if (initialData.type === 'FIXED_SIMULATION') {
        setActiveTab('FIXED');
        if (initialData.initial_amount) setFixedAmount(initialData.initial_amount.toString());
        if (initialData.indexer_type) setFixedIndexerType(initialData.indexer_type);
        if (initialData.indexer_rate) setFixedIndexerRate(initialData.indexer_rate.toString());
        if (initialData.is_tax_free !== undefined) {
          setFixedIsTaxFree(initialData.is_tax_free);
          setFixedType(initialData.is_tax_free ? 'LCI' : 'CDB');
        }
        if (initialData.term_months) {
          const d = new Date();
          d.setMonth(d.getMonth() + initialData.term_months);
          setFixedMaturityDate(d.toISOString().split('T')[0]);
        }
      }
    }
  }, [initialData]);

  // Busca cotação na Brapi quando o ticker tem pelo menos 4 caracteres
  useEffect(() => {
    const clean = ticker.trim().toUpperCase();
    if (clean.length >= 4) {
      // Sugestões
      api.searchTickers(clean).then(setTickerSuggestions).catch(() => {});

      // Cotação ao vivo
      const timer = setTimeout(async () => {
        try {
          setFetchingQuote(true);
          const quote = await api.getQuote(clean);
          if (quote && quote.regular_market_price > 0) {
            setQuoteInfo(quote);
            // Preenche o preço se estiver vazio ou se for novo ticker
            if (!unitPrice || unitPrice === '0') {
              setUnitPrice(quote.regular_market_price.toString());
            }
          }
        } catch {
          // silencia erro de cotação não encontrada
        } finally {
          setFetchingQuote(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setTickerSuggestions([]);
      setQuoteInfo(null);
    }
  }, [ticker]);

  // Se o tipo for LCI ou LCA, marca automaticamente isenção de IR
  useEffect(() => {
    if (['LCI', 'LCA', 'CRI', 'CRA'].includes(fixedType)) {
      setFixedIsTaxFree(true);
    }
  }, [fixedType]);

  if (!isOpen) return null;

  // Cálculos dinâmicos
  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(unitPrice) || 0;
  const feesNum = parseFloat(fees) || 0;
  const variableTotal = (qtyNum * priceNum) + (varType === 'COMPRA' ? feesNum : -feesNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      if (activeTab === 'VARIABLE') {
        if (!ticker.trim()) throw new Error('Código do ativo (ticker) é obrigatório.');
        if (varType !== 'PROVENTO' && qtyNum <= 0) throw new Error('Quantidade deve ser maior que zero.');
        if (priceNum <= 0 && varType !== 'PROVENTO') throw new Error('Preço unitário deve ser maior que zero.');

        await api.createTransaction({
          category: 'RENDA_VARIAVEL',
          type: varType,
          asset_type: assetType,
          ticker_or_name: ticker.trim().toUpperCase(),
          quantity: qtyNum,
          unit_price: priceNum,
          total_amount: variableTotal > 0 ? variableTotal : (qtyNum * priceNum),
          fees: feesNum,
          date,
          notes
        });
      } else {
        // Renda Fixa
        if (!fixedName.trim()) throw new Error('Nome do título é obrigatório.');
        const initialAmt = parseFloat(fixedAmount);
        if (!initialAmt || initialAmt <= 0) throw new Error('Valor investido deve ser maior que zero.');

        await api.createFixedIncome({
          name: fixedName.trim(),
          issuer: fixedIssuer.trim() || 'Emissor Diversificado',
          asset_type: fixedType,
          indexer_type: fixedIndexerType,
          indexer_rate: parseFloat(fixedIndexerRate) || 100,
          initial_amount: initialAmt,
          current_amount: fixedCurrentAmount ? parseFloat(fixedCurrentAmount) : initialAmt,
          start_date: fixedStartDate,
          maturity_date: fixedMaturityDate || null,
          liquidity_type: fixedLiquidity,
          is_tax_free: fixedIsTaxFree,
          notes: fixedNotes
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao salvar operação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden my-8">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Nova Operação</h3>
            <p className="text-xs text-slate-500 mt-0.5">Registre compras, vendas, proventos ou títulos de renda fixa</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas: Renda Variável vs Renda Fixa */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('VARIABLE')}
            className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'VARIABLE'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Renda Variável (B3)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FIXED')}
            className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'FIXED'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-blue-600" />
            <span>Renda Fixa</span>
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {activeTab === 'VARIABLE' ? (
            <>
              {/* Tipo de Operação: Compra, Venda, Provento */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'COMPRA', label: 'Compra', activeCls: 'bg-emerald-600 border-emerald-600 text-white' },
                  { id: 'VENDA', label: 'Venda', activeCls: 'bg-rose-600 border-rose-600 text-white' },
                  { id: 'PROVENTO', label: 'Provento', activeCls: 'bg-amber-600 border-amber-600 text-white' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setVarType(t.id)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      varType === t.id
                        ? t.activeCls
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Ticker com Busca Brapi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código do Ativo (Ticker B3)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: PETR4, VALE3, MXRF11, IVVB11..."
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-emerald-600 uppercase font-bold tracking-wider placeholder:text-slate-400"
                  />
                  {fetchingQuote && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 flex items-center space-x-1 font-medium">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Buscando Brapi...</span>
                    </div>
                  )}
                </div>

                {/* Sugestões de Tickers Populares */}
                {tickerSuggestions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {tickerSuggestions.slice(0, 5).map((sug) => (
                      <button
                        key={sug.symbol}
                        type="button"
                        onClick={() => {
                          setTicker(sug.symbol);
                          setAssetType(sug.type);
                          setTickerSuggestions([]);
                        }}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition font-medium"
                      >
                        {sug.symbol} ({sug.name})
                      </button>
                    ))}
                  </div>
                )}

                {/* Tag de Cotação Encontrada */}
                {quoteInfo && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold">{quoteInfo.long_name || quoteInfo.symbol}</span>
                    <span className="font-bold">Cotação Brapi: {formatCurrency(quoteInfo.regular_market_price)}</span>
                  </div>
                )}
              </div>

              {/* Categoria do Ativo */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'ACAO', label: 'Ação' },
                  { id: 'FII', label: 'FII' },
                  { id: 'BDR', label: 'BDR' },
                  { id: 'ETF', label: 'ETF' },
                  { id: 'CRIPTO', label: 'Cripto' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAssetType(cat.id)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      assetType === cat.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quantidade e Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {varType === 'PROVENTO' ? 'Qtd de Cotas com Direito' : 'Quantidade de Cotas'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required={varType !== 'PROVENTO'}
                    placeholder="Ex: 100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-emerald-600 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {varType === 'PROVENTO' ? 'Valor por Cota (R$)' : 'Preço Unitário (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="0,00"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-emerald-600 font-semibold placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Taxas e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxas e Corretagem (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Operação
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Valor Total Calculado */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Valor Total Financeiro:</span>
                <span className="text-base font-extrabold text-slate-900">{formatCurrency(variableTotal)}</span>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas / Estratégia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aporte mensal, reinvestimento de dividendos..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-emerald-600 placeholder:text-slate-400"
                />
              </div>
            </>
          ) : (
            <>
              {/* Formulário Renda Fixa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Investimento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CDB Liquidez Diária"
                    value={fixedName}
                    onChange={(e) => setFixedName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600 font-medium placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emissor / Instituição
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco Inter, Nubank, XP..."
                    value={fixedIssuer}
                    onChange={(e) => setFixedIssuer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Tipo e Indexador */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Título
                  </label>
                  <select
                    value={fixedType}
                    onChange={(e) => setFixedType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  >
                    <option value="CDB">CDB</option>
                    <option value="LCI">LCI</option>
                    <option value="LCA">LCA</option>
                    <option value="TESOURO_SELIC">Tesouro Selic</option>
                    <option value="TESOURO_IPCA">Tesouro IPCA+</option>
                    <option value="TESOURO_PREFIXADO">Tesouro Prefixado</option>
                    <option value="CRI">CRI</option>
                    <option value="CRA">CRA</option>
                    <option value="DEBENTURE">Debênture</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Indexador
                  </label>
                  <select
                    value={fixedIndexerType}
                    onChange={(e) => setFixedIndexerType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  >
                    <option value="CDI">% do CDI</option>
                    <option value="IPCA">IPCA + taxa</option>
                    <option value="PREFIXADO">Prefixado (a.a.)</option>
                    <option value="SELIC">Selic + taxa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxa ({fixedIndexerType === 'CDI' ? '%' : '% a.a.'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={fixedIndexerType === 'CDI' ? '110' : '6.5'}
                    value={fixedIndexerRate}
                    onChange={(e) => setFixedIndexerRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600 font-semibold placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Aplicado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 5000,00"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600 font-bold placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Saldo Atual Bruto (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Deixe em branco para usar o aplicado"
                    value={fixedCurrentAmount}
                    onChange={(e) => setFixedCurrentAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Datas e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Aplicação
                  </label>
                  <input
                    type="date"
                    required
                    value={fixedStartDate}
                    onChange={(e) => setFixedStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={fixedMaturityDate}
                    onChange={(e) => setFixedMaturityDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Liquidez e Isenção de IR */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={fixedIsTaxFree}
                    onChange={(e) => setFixedIsTaxFree(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300"
                  />
                  <span>Isento de Imposto de Renda (LCI, LCA, CRI, CRA)</span>
                </label>
              </div>
            </>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition ${
                activeTab === 'VARIABLE'
                  ? 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
              }`}
            >
              {submitting ? 'Salvando...' : 'Confirmar Operação'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

