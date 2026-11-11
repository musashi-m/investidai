import React, { useState } from 'react';
import { X, Landmark, TrendingUp, CheckCircle2 } from 'lucide-react';
import { api, formatCurrency, formatPercent } from '../api';

export default function UpdateBalanceModal({ 
  isOpen, 
  onClose, 
  asset, 
  onSuccess 
}) {
  if (!isOpen || !asset) return null;

  const [newAmount, setNewAmount] = useState(asset.current_amount?.toString() || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numVal = parseFloat(newAmount) || 0;
  const initial = asset.initial_amount || 0;
  const newProfit = numVal - initial;
  const newProfitPercent = initial > 0 ? (newProfit / initial) * 100 : 0;

  const handleSave = async (e) => {
    e.preventDefault();
    if (numVal <= 0) {
      setError('O valor do saldo deve ser maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.updateBalance(asset.id, numVal);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar saldo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Atualizar Saldo Bruto</h3>
            <p className="text-xs text-slate-500 mt-0.5">{asset.name} ({asset.issuer})</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Valor Aplicado Inicial:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(asset.initial_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Saldo Registrado Anterior:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(asset.current_amount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Novo Saldo Atual (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-base font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-medium">Novo Rendimento Estimado:</span>
            <div className="text-right">
              <span className="font-bold text-emerald-700 block">+{formatCurrency(newProfit)}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{formatPercent(newProfitPercent)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Atualizar Saldo'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

