import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '../api';

const TYPE_CONFIG = {
  COMPRA: { label: 'Compra', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: TrendingUp },
  VENDA: { label: 'Venda', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: TrendingDown },
  PROVENTO: { label: 'Provento', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: PiggyBank },
  APORTE: { label: 'Aporte RF', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ArrowUpCircle },
  RESGATE: { label: 'Resgate RF', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: ArrowDownCircle },
};

export default function TransactionsView({ 
  transactions = [], 
  loading, 
  onDeleteTransaction, 
  onOpenNewTransaction 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filtered = transactions.filter((tx) => {
    const matchesSearch = tx.ticker_or_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'ALL' || tx.type === selectedType;
    const matchesCat = selectedCategory === 'ALL' || tx.category === selectedCategory;
    return matchesSearch && matchesType && matchesCat;
  });

  const typesList = [
    { id: 'ALL', label: 'Todos os Tipos' },
    { id: 'COMPRA', label: 'Compras' },
    { id: 'VENDA', label: 'Vendas' },
    { id: 'PROVENTO', label: 'Proventos' },
    { id: 'APORTE', label: 'Aportes RF' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Controles de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por ativo ou anotação (PETR4, CDB...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 text-slate-800 placeholder:text-slate-400 text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-600 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {typesList.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedType === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Extrato de Transações (Estilo Investidor10) */}
      <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-gray-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-3">Operação</th>
                <th className="py-3.5 px-4">Ativo</th>
                <th className="py-3.5 px-3 text-right">Quantidade</th>
                <th className="py-3.5 px-3 text-right">Preço Unitário</th>
                <th className="py-3.5 px-3 text-right">Taxas</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
                <th className="py-3.5 px-4">Observações</th>
                <th className="py-3.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma operação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const typeConf = TYPE_CONFIG[tx.type] || TYPE_CONFIG.COMPRA;
                  const Icon = typeConf.icon;
                  const isNegative = tx.type === 'VENDA' || tx.type === 'RESGATE';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Data */}
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        <span className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(tx.date)}</span>
                        </span>
                      </td>

                      {/* Operação / Tipo */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeConf.color}`}>
                          <Icon className="w-3 h-3" />
                          <span>{typeConf.label}</span>
                        </span>
                      </td>

                      {/* Ativo */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{tx.ticker_or_name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{tx.asset_type}</div>
                      </td>

                      {/* Quantidade */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {tx.quantity > 0 ? tx.quantity.toLocaleString('pt-BR') : '-'}
                      </td>

                      {/* Preço Unitário */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {tx.unit_price > 0 ? formatCurrency(tx.unit_price) : '-'}
                      </td>

                      {/* Taxas */}
                      <td className="py-3 px-3 text-right text-slate-500">
                        {tx.fees > 0 ? formatCurrency(tx.fees) : '-'}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-4 text-right font-black">
                        <span className={tx.type === 'PROVENTO' ? 'text-amber-600' : (isNegative ? 'text-rose-600' : 'text-slate-900')}>
                          {formatCurrency(tx.total_amount)}
                        </span>
                      </td>

                      {/* Observações */}
                      <td className="py-3 px-4 text-slate-500 text-xs truncate max-w-[180px]" title={tx.notes}>
                        {tx.notes || '-'}
                      </td>

                      {/* Ação: Excluir */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Excluir operação"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
