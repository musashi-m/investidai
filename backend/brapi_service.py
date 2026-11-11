import datetime
import logging
from typing import Dict, List, Optional, Any
import requests
from backend.database import get_db

logger = logging.getLogger(__name__)

POPULAR_TICKERS = [
    {"symbol": "PETR4", "name": "Petrobras PN", "type": "ACAO"},
    {"symbol": "PETR3", "name": "Petrobras ON", "type": "ACAO"},
    {"symbol": "VALE3", "name": "Vale S.A.", "type": "ACAO"},
    {"symbol": "ITUB4", "name": "Itaú Unibanco PN", "type": "ACAO"},
    {"symbol": "BBDC4", "name": "Bradesco PN", "type": "ACAO"},
    {"symbol": "BBAS3", "name": "Banco do Brasil ON", "type": "ACAO"},
    {"symbol": "WEGE3", "name": "WEG ON", "type": "ACAO"},
    {"symbol": "ABEV3", "name": "Ambev S.A.", "type": "ACAO"},
    {"symbol": "RENT3", "name": "Localiza Rent a Car", "type": "ACAO"},
    {"symbol": "MGLU3", "name": "Magazine Luiza ON", "type": "ACAO"},
    {"symbol": "TAEE11", "name": "Taesa Unit", "type": "ACAO"},
    {"symbol": "MXRF11", "name": "Maxi Renda FII", "type": "FII"},
    {"symbol": "HGLG11", "name": "CSHG Logística FII", "type": "FII"},
    {"symbol": "XPLG11", "name": "XP Log FII", "type": "FII"},
    {"symbol": "KNIP11", "name": "Kinea Rendimentos Imobiliários", "type": "FII"},
    {"symbol": "KNCR11", "name": "Kinea Rendimentos Imob.", "type": "FII"},
    {"symbol": "CPTS11", "name": "Capitânia Securities FII", "type": "FII"},
    {"symbol": "VISC11", "name": "Vinci Shopping Centers FII", "type": "FII"},
    {"symbol": "XPML11", "name": "XP Malls FII", "type": "FII"},
    {"symbol": "IVVB11", "name": "iShares S&P 500 Fundo de Índice", "type": "ETF"},
    {"symbol": "BOVA11", "name": "iShares Ibovespa Fundo de Índice", "type": "ETF"},
    {"symbol": "SMAL11", "name": "iShares Small Cap ETF", "type": "ETF"},
    {"symbol": "AAPL34", "name": "Apple Inc. BDR", "type": "BDR"},
    {"symbol": "MSFT34", "name": "Microsoft Corp. BDR", "type": "BDR"},
    {"symbol": "NVDC34", "name": "NVIDIA Corp. BDR", "type": "BDR"},
    {"symbol": "AMZO34", "name": "Amazon.com Inc. BDR", "type": "BDR"},
    {"symbol": "GOGL34", "name": "Alphabet Inc. (Google) BDR", "type": "BDR"},
    {"symbol": "BTC", "name": "Bitcoin", "type": "CRIPTO"},
    {"symbol": "ETH", "name": "Ethereum", "type": "CRIPTO"},
    {"symbol": "SOL", "name": "Solana", "type": "CRIPTO"},
]

class BrapiService:
    BASE_URL = "https://brapi.dev/api"
    HEADERS = {"User-Agent": "GerenciadorInvestimentos/1.0 (Windows NT 10.0; Win64; x64)"}

    @staticmethod
    def get_token() -> str:
        with get_db() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key = 'brapi_token'").fetchone()
            return row["value"].strip() if row and row["value"] else ""

    @staticmethod
    def set_token(token: str):
        with get_db() as conn:
            conn.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES ('brapi_token', ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                (token.strip(),)
            )

    @classmethod
    def fetch_quotes(cls, symbols: List[str], force: bool = False) -> Dict[str, Any]:
        """
        Busca cotações para uma lista de ativos na Brapi.
        Salva no banco SQLite para cache local rápido.
        """
        clean_symbols = [s.strip().upper() for s in symbols if s and s.strip()]
        if not clean_symbols:
            return {}

        token = cls.get_token()
        now = datetime.datetime.now(datetime.timezone.utc)
        results: Dict[str, Any] = {}
        missing_or_stale: List[str] = []

        # 1. Checa o cache local
        with get_db() as conn:
            setting_row = conn.execute("SELECT value FROM settings WHERE key = 'auto_refresh_minutes'").fetchone()
            cache_minutes = float(setting_row["value"]) if setting_row and setting_row["value"] else 3.0
            cache_seconds = max(30, int(cache_minutes * 60))

            for symbol in clean_symbols:
                row = conn.execute("SELECT * FROM market_cache WHERE symbol = ?", (symbol,)).fetchone()
                if row and not force:
                    updated_at_str = row["updated_at"]
                    # Verifica se o cache é recente
                    try:
                        updated_at = datetime.datetime.strptime(updated_at_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
                        age_seconds = (now - updated_at).total_seconds()
                        if age_seconds < cache_seconds:
                            results[symbol] = dict(row)
                            continue
                    except Exception:
                        pass
                missing_or_stale.append(symbol)

        if not missing_or_stale:
            return results

        # 2. Chama a API da Brapi
        if token:
            # Com token: consulta em lotes eficientes
            chunk_size = 15
            for i in range(0, len(missing_or_stale), chunk_size):
                chunk = missing_or_stale[i:i + chunk_size]
                tickers_query = ",".join(chunk)
                url = f"{cls.BASE_URL}/quote/{tickers_query}"
                try:
                    resp = requests.get(url, params={"token": token}, headers=cls.HEADERS, timeout=10)
                    if resp.status_code == 200:
                        cls._save_quote_results(resp.json().get("results", []), now, results)
                    else:
                        cls._load_cached_fallbacks(chunk, results)
                except Exception as e:
                    logger.error(f"Erro ao buscar na Brapi com token ({tickers_query}): {e}")
                    cls._load_cached_fallbacks(chunk, results)
        else:
            # Sem token: consulta individualmente (para aproveitar os tickers gratuitos como PETR4, VALE3, ITUB4)
            for sym in missing_or_stale:
                url = f"{cls.BASE_URL}/quote/{sym}"
                try:
                    resp = requests.get(url, headers=cls.HEADERS, timeout=6)
                    if resp.status_code == 200:
                        cls._save_quote_results(resp.json().get("results", []), now, results)
                    else:
                        cls._load_cached_fallbacks([sym], results)
                except Exception as e:
                    logger.warning(f"Erro na cotação sem token de {sym}: {e}")
                    cls._load_cached_fallbacks([sym], results)

        return results

    @classmethod
    def _save_quote_results(cls, quote_list: List[Dict[str, Any]], now: datetime.datetime, results: Dict[str, Any]):
        with get_db() as conn:
            for q in quote_list:
                sym = q.get("symbol", "").upper()
                if not sym:
                    continue
                item = {
                    "symbol": sym,
                    "short_name": q.get("shortName") or sym,
                    "long_name": q.get("longName") or sym,
                    "currency": q.get("currency", "BRL"),
                    "regular_market_price": q.get("regularMarketPrice", 0.0),
                    "regular_market_change": q.get("regularMarketChange", 0.0),
                    "regular_market_change_percent": q.get("regularMarketChangePercent", 0.0),
                    "regular_market_day_high": q.get("regularMarketDayHigh", 0.0),
                    "regular_market_day_low": q.get("regularMarketDayLow", 0.0),
                    "regular_market_previous_close": q.get("regularMarketPreviousClose", 0.0),
                    "regular_market_volume": q.get("regularMarketVolume", 0),
                    "market_cap": q.get("marketCap", 0),
                    "logo_url": q.get("logourl") or f"https://icons.brapi.dev/icons/{sym}.svg",
                    "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
                }
                conn.execute("""
                    INSERT INTO market_cache (
                        symbol, short_name, long_name, currency,
                        regular_market_price, regular_market_change, regular_market_change_percent,
                        regular_market_day_high, regular_market_day_low, regular_market_previous_close,
                        regular_market_volume, market_cap, logo_url, updated_at
                    ) VALUES (
                        :symbol, :short_name, :long_name, :currency,
                        :regular_market_price, :regular_market_change, :regular_market_change_percent,
                        :regular_market_day_high, :regular_market_day_low, :regular_market_previous_close,
                        :regular_market_volume, :market_cap, :logo_url, CURRENT_TIMESTAMP
                    ) ON CONFLICT(symbol) DO UPDATE SET
                        short_name = excluded.short_name,
                        long_name = excluded.long_name,
                        currency = excluded.currency,
                        regular_market_price = excluded.regular_market_price,
                        regular_market_change = excluded.regular_market_change,
                        regular_market_change_percent = excluded.regular_market_change_percent,
                        regular_market_day_high = excluded.regular_market_day_high,
                        regular_market_day_low = excluded.regular_market_day_low,
                        regular_market_previous_close = excluded.regular_market_previous_close,
                        regular_market_volume = excluded.regular_market_volume,
                        market_cap = excluded.market_cap,
                        logo_url = excluded.logo_url,
                        updated_at = CURRENT_TIMESTAMP
                """, item)
                results[sym] = item

    @classmethod
    def _load_cached_fallbacks(cls, symbols: List[str], results: Dict[str, Any]):
        with get_db() as conn:
            for s in symbols:
                row = conn.execute("SELECT * FROM market_cache WHERE symbol = ?", (s,)).fetchone()
                if row:
                    results[s] = dict(row)

        return results

    @classmethod
    def get_market_indicators(cls) -> Dict[str, Any]:
        """
        Retorna indicadores macroeconômicos: Selic, CDI, IPCA, Dólar e IBOV
        Combina Brapi e API do Banco Central para máxima confiabilidade.
        """
        indicators = {
            "selic": {"value": 13.75, "period": "a.a.", "label": "Taxa Selic"},
            "cdi": {"value": 13.65, "period": "a.a.", "label": "CDI Atual"},
            "ipca": {"value": 4.15, "period": "12m", "label": "IPCA (12 meses)"},
            "ibov": {"value": 128500.0, "change_percent": 0.0, "label": "IBOVESPA"},
            "dolar": {"value": 5.45, "change_percent": 0.0, "label": "Dólar Comercial"}
        }

        # 1. Tenta buscar Selic Meta do Banco Central (oficial e sem necessidade de token)
        try:
            r_selic = requests.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", headers=cls.HEADERS, timeout=4)
            if r_selic.status_code == 200:
                data = r_selic.json()
                if data and len(data) > 0:
                    val = float(data[0]["valor"])
                    indicators["selic"]["value"] = val
                    indicators["cdi"]["value"] = round(val - 0.10, 2)
        except Exception:
            pass

        # 2. Tenta buscar IPCA 12m do BCB (Série 13522)
        try:
            r_ipca = requests.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json", headers=cls.HEADERS, timeout=4)
            if r_ipca.status_code == 200:
                data = r_ipca.json()
                if data and len(data) > 0:
                    indicators["ipca"]["value"] = float(data[0]["valor"])
        except Exception:
            pass

        # 3. Busca IBOVESPA (^BVSP) e Dólar (USDBRL) via Brapi
        try:
            quotes = cls.fetch_quotes(["^BVSP", "USDBRL=X", "USD-BRL"], force=False)
            if "^BVSP" in quotes:
                indicators["ibov"]["value"] = quotes["^BVSP"]["regular_market_price"]
                indicators["ibov"]["change_percent"] = quotes["^BVSP"]["regular_market_change_percent"]
            for usd_sym in ["USDBRL=X", "USD-BRL"]:
                if usd_sym in quotes and quotes[usd_sym]["regular_market_price"] > 0:
                    indicators["dolar"]["value"] = quotes[usd_sym]["regular_market_price"]
                    indicators["dolar"]["change_percent"] = quotes[usd_sym]["regular_market_change_percent"]
                    break
        except Exception:
            pass

        return indicators
