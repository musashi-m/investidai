import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  ExternalLink, 
  Save, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle,
  FolderDown,
  RotateCcw
} from 'lucide-react';
import { api } from '../api';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  onSettingsUpdated 
}) {
  const [token, setToken] = useState('');
  const [portfolioName, setPortfolioName] = useState('Minha Carteira');
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState(2);
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSuccessMsg('');
      setErrorMsg('');
      api.getSettings().then((res) => {
        setToken(res.brapi_token || '');
        setHasToken(res.has_brapi_token);
        setPortfolioName(res.portfolio_name || 'Minha Carteira');
        setAutoRefreshMinutes(res.auto_refresh_minutes !== undefined ? res.auto_refresh_minutes : 2);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.updateSettings({
        brapi_token: token.trim(),
        portfolio_name: portfolioName.trim(),
        auto_refresh_minutes: parseInt(autoRefreshMinutes)
      });
      setSuccessMsg('Configurações salvas com sucesso!');
      setHasToken(Boolean(token.trim()));
      onSettingsUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Atenção: deseja realmente limpar todos os registros da carteira? Esta ação apagará todas as transações cadastradas.')) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.clearAllData();
      setSuccessMsg('Carteira zerada com sucesso!');
      onSettingsUpdated();
    } catch (err) {
      setErrorMsg('Erro ao limpar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden my-8">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Configurações & Brapi</h3>
              <p className="text-xs text-slate-500">Gerencie a chave da API e preferências da carteira</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificações */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          
          {/* Campo Nome da Carteira e Intervalo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Carteira
              </label>
              <input
                type="text"
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Atualização Automática
              </label>
              <select
                value={autoRefreshMinutes}
                onChange={(e) => setAutoRefreshMinutes(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-emerald-600 font-medium"
              >
                <option value={1}>A cada 1 minuto (Mais rápido)</option>
                <option value={2}>A cada 2 minutos (Recomendado)</option>
                <option value={5}>A cada 5 minutos</option>
                <option value={15}>A cada 15 minutos</option>
                <option value={0}>Apenas manual (botão Sincronizar)</option>
              </select>
            </div>
          </div>

          {/* Campo Brapi Token */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>Token de Autenticação Brapi</span>
                {hasToken ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                    Ativo
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                    Não configurado
                  </span>
                )}
              </label>

              <a
                href="https://brapi.dev/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1"
              >
                <span>Obter Token Grátis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="text"
              placeholder="Cole seu token da Brapi aqui (ex: eyJhbGciOi...)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-600 placeholder:text-slate-400"
            />

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 A Brapi fornece um plano gratuito permanente para consultas na B3. Com o token, você atualiza instantaneamente todos os seus FIIs, Ações e BDRs em tempo real.
            </p>
          </div>

          {/* Ações Avançadas: Gerenciamento e Backup */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-semibold text-slate-600 block">Gerenciamento de Dados (LocalStorage)</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={loading}
                className="flex items-center justify-center space-x-1.5 p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zerar Carteira</span>
              </button>

              <button
                type="button"
                onClick={() => api.exportBackup()}
                className="flex items-center justify-center space-x-1.5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
              >
                <FolderDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Exportar Backup</span>
              </button>

              <label className="flex items-center justify-center space-x-1.5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restaurar Backup</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const text = await file.text();
                      try {
                        await api.importBackup(text);
                        setSuccessMsg('Backup restaurado com sucesso!');
                        onSettingsUpdated();
                      } catch (err) {
                        setErrorMsg('Erro ao restaurar backup: ' + err.message);
                      }
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Botões Salvar */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

