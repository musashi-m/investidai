import datetime
from typing import Dict, List, Any
from backend.database import get_db
from backend.brapi_service import BrapiService
from backend.fixed_income_calc import calculate_fixed_income_position

class PortfolioService:

    @classmethod
    def get_variable_positions(cls, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Calcula as posições de renda variável considerando todas as transações,
        calculando Preço Médio (PM), lucro realizado, cotação atual e lucro não realizado.
        """
        with get_db() as conn:
            # Busca todas as transações de renda variável ordenadas
            rows = conn.execute("""
                SELECT * FROM transactions 
                WHERE category = 'RENDA_VARIAVEL'
                ORDER BY date ASC, id ASC
            """).fetchall()

            # Busca todos os dividendos
            div_rows = conn.execute("""
                SELECT ticker, SUM(total_amount) as total_div
                FROM dividends
                GROUP BY ticker
            """).fetchall()
            dividends_by_ticker = {r["ticker"].upper(): float(r["total_div"]) for r in div_rows}

        # Agrupa e calcula PM por ticker
        tickers_data: Dict[str, Dict[str, Any]] = {}

        for r in rows:
            ticker = r["ticker_or_name"].strip().upper()
            tx_type = r["type"].upper()
            qty = float(r["quantity"] or 0)
            price = float(r["unit_price"] or 0)
            fees = float(r["fees"] or 0)
            total = float(r["total_amount"] or (qty * price + fees))
            asset_type = r["asset_type"]

            if ticker not in tickers_data:
                tickers_data[ticker] = {
                    "ticker": ticker,
                    "asset_type": asset_type,
                    "quantity": 0.0,
                    "total_cost": 0.0,
                    "average_price": 0.0,
                    "realized_pnl": 0.0,
                    "total_bought_amount": 0.0,
                    "total_sold_amount": 0.0,
                    "transaction_count": 0
                }

            item = tickers_data[ticker]
            item["transaction_count"] += 1

            if tx_type == "COMPRA":
                cost = (qty * price) + fees
                item["total_cost"] += cost
                item["total_bought_amount"] += cost
                item["quantity"] += qty
                if item["quantity"] > 0:
                    item["average_price"] = item["total_cost"] / item["quantity"]
            elif tx_type == "VENDA":
                if item["quantity"] > 0:
                    cost_basis = qty * item["average_price"]
                    net_proceeds = (qty * price) - fees
                    profit = net_proceeds - cost_basis
                    item["realized_pnl"] += profit
                    item["total_sold_amount"] += net_proceeds
                    item["quantity"] -= qty
                    item["total_cost"] -= cost_basis
                    if item["quantity"] <= 0.000001:
                        item["quantity"] = 0.0
                        item["total_cost"] = 0.0
                        item["average_price"] = 0.0
                    else:
                        item["average_price"] = item["total_cost"] / item["quantity"]

        # Filtra ativos com posição ativa (ou que tiveram operações)
        active_tickers = [t for t, data in tickers_data.items() if data["quantity"] > 0]
        
        # Busca cotações atualizadas via Brapi
        quotes = BrapiService.fetch_quotes(active_tickers, force=force_refresh) if active_tickers else {}

        positions: List[Dict[str, Any]] = []

        for ticker, data in tickers_data.items():
            if data["quantity"] <= 0:
                continue

            quote = quotes.get(ticker, {})
            current_price = quote.get("regular_market_price")
            # Se não encontrou cotação, usa o Preço Médio como fallback
            if current_price is None or current_price == 0:
                current_price = data["average_price"]

            change_pct = quote.get("regular_market_change_percent", 0.0)
            change_val = quote.get("regular_market_change", 0.0)
            logo_url = quote.get("logo_url") or f"https://icons.brapi.dev/icons/{ticker}.svg"
            long_name = quote.get("long_name") or quote.get("short_name") or ticker

            qty = data["quantity"]
            avg_price = data["average_price"]
            invested_amount = qty * avg_price
            current_value = qty * current_price
            unrealized_pnl = current_value - invested_amount
            unrealized_pnl_pct = ((current_price / avg_price) - 1.0) * 100.0 if avg_price > 0 else 0.0
            day_pnl = qty * change_val
            dividends = dividends_by_ticker.get(ticker, 0.0)
            total_return = unrealized_pnl + dividends
            total_return_pct = (total_return / invested_amount) * 100.0 if invested_amount > 0 else 0.0

            positions.append({
                "ticker": ticker,
                "name": long_name,
                "asset_type": data["asset_type"],
                "quantity": qty,
                "average_price": round(avg_price, 4),
                "current_price": round(current_price, 4),
                "invested_amount": round(invested_amount, 2),
                "current_value": round(current_value, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "unrealized_pnl_percent": round(unrealized_pnl_pct, 2),
                "day_change": round(change_val, 4),
                "day_change_percent": round(change_pct, 2),
                "day_pnl": round(day_pnl, 2),
                "dividends_received": round(dividends, 2),
                "total_return": round(total_return, 2),
                "total_return_percent": round(total_return_pct, 2),
                "realized_pnl": round(data["realized_pnl"], 2),
                "logo_url": logo_url,
                "last_updated": quote.get("updated_at")
            })

        # Ordena por valor atual decrescente
        positions.sort(key=lambda x: x["current_value"], reverse=True)
        return positions

    @classmethod
    def get_fixed_income_positions(cls) -> List[Dict[str, Any]]:
        """
        Calcula automaticamente a rentabilidade da renda fixa com base nos dias úteis
        decorridos e nas taxas atuais de mercado (CDI, Selic, IPCA e Prefixado).
        """
        indicators = BrapiService.get_market_indicators()
        selic_annual = indicators.get("selic", {}).get("value", 13.75)
        cdi_annual = indicators.get("cdi", {}).get("value", 13.65)
        ipca_annual = indicators.get("ipca", {}).get("value", 4.58)

        positions: List[Dict[str, Any]] = []

        with get_db() as conn:
            rows = conn.execute("""
                SELECT * FROM fixed_income_assets
                WHERE status = 'ATIVO'
                ORDER BY maturity_date ASC, id DESC
            """).fetchall()

            for r in rows:
                item = dict(r)
                initial = float(item["initial_amount"])
                start_date = item.get("start_date")
                maturity_date = item.get("maturity_date")
                idx_type = item.get("indexer_type", "CDI")
                idx_rate = float(item.get("indexer_rate", 100))
                is_tax_free = bool(item.get("is_tax_free", 0))

                # Cálculo de mercado em tempo real
                calc_result = calculate_fixed_income_position(
                    initial_amount=initial,
                    start_date_str=start_date,
                    maturity_date_str=maturity_date,
                    indexer_type=idx_type,
                    indexer_rate=idx_rate,
                    selic_rate_annual=selic_annual,
                    cdi_rate_annual=cdi_annual,
                    ipca_rate_annual=ipca_annual,
                    is_tax_free=is_tax_free
                )

                # Atualiza o saldo calculado no banco para persistência
                conn.execute(
                    "UPDATE fixed_income_assets SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (calc_result["current_amount"], item["id"])
                )

                # Mescla dados cadastrais com o cálculo dinâmico
                item.update(calc_result)
                item["profit"] = calc_result["gross_profit"]
                item["profit_percent"] = calc_result["gross_profit_percent"]

                positions.append(item)

        return positions

    @classmethod
    def get_dashboard_summary(cls, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retorna o resumo consolidado de toda a carteira:
        Patrimônio Total, Total Investido, Lucro Total, Alocações, Variação do Dia, etc.
        """
        var_positions = cls.get_variable_positions(force_refresh=force_refresh)
        fixed_positions = cls.get_fixed_income_positions()

        # Renda Variável Totals
        var_invested = sum(p["invested_amount"] for p in var_positions)
        var_current = sum(p["current_value"] for p in var_positions)
        var_pnl = sum(p["unrealized_pnl"] for p in var_positions)
        var_day_pnl = sum(p["day_pnl"] for p in var_positions)
        var_realized = sum(p["realized_pnl"] for p in var_positions)
        var_dividends = sum(p["dividends_received"] for p in var_positions)

        # Renda Fixa Totals
        fixed_invested = sum(p["initial_amount"] for p in fixed_positions)
        fixed_current = sum(p["current_amount"] for p in fixed_positions)
        fixed_net_current = sum(p.get("net_amount", p["current_amount"]) for p in fixed_positions)
        fixed_pnl = fixed_current - fixed_invested
        fixed_day_gain = sum(p.get("estimated_daily_gain", 0.0) for p in fixed_positions)

        # Consolidado
        total_invested = var_invested + fixed_invested
        total_current = var_current + fixed_current
        total_profit = total_current - total_invested
        total_profit_pct = ((total_current / total_invested) - 1.0) * 100.0 if total_invested > 0 else 0.0
        total_day_pnl = var_day_pnl + fixed_day_gain
        day_change_pct = (total_day_pnl / total_current) * 100.0 if total_current > 0 else 0.0

        # Alocação por Classe de Ativo (Renda Fixa, Ações, FIIs, BDRs, ETFs, Cripto)
        categories: Dict[str, float] = {
            "RENDA_FIXA": fixed_current,
            "ACAO": 0.0,
            "FII": 0.0,
            "BDR": 0.0,
            "ETF": 0.0,
            "CRIPTO": 0.0,
            "OUTRO": 0.0
        }

        for p in var_positions:
            cat = p["asset_type"].upper()
            if cat in categories:
                categories[cat] += p["current_value"]
            else:
                categories["OUTRO"] += p["current_value"]

        category_labels = {
            "RENDA_FIXA": "Renda Fixa",
            "ACAO": "Ações",
            "FII": "Fundos Imobiliários",
            "BDR": "BDRs (Internacional)",
            "ETF": "ETFs",
            "CRIPTO": "Criptomoedas",
            "OUTRO": "Outros"
        }

        allocation_by_category = []
        if total_current > 0:
            for cat_key, cat_value in categories.items():
                if cat_value > 0:
                    pct = (cat_value / total_current) * 100.0
                    allocation_by_category.append({
                        "category": cat_key,
                        "label": category_labels.get(cat_key, cat_key),
                        "value": round(cat_value, 2),
                        "percent": round(pct, 2)
                    })

        # Alocação por Ativos (Top Ativos)
        asset_allocations = []
        # Adiciona variáveis
        for p in var_positions:
            pct = (p["current_value"] / total_current) * 100.0 if total_current > 0 else 0.0
            asset_allocations.append({
                "ticker": p["ticker"],
                "name": p["name"],
                "type": p["asset_type"],
                "value": p["current_value"],
                "percent": round(pct, 2),
                "pnl_percent": p["unrealized_pnl_percent"],
                "logo_url": p["logo_url"]
            })
        # Adiciona renda fixa
        for f in fixed_positions:
            pct = (f["current_amount"] / total_current) * 100.0 if total_current > 0 else 0.0
            asset_allocations.append({
                "ticker": f["name"],
                "name": f"{f['issuer']} - {f['indexer_label']}",
                "type": "RENDA_FIXA",
                "value": f["current_amount"],
                "percent": round(pct, 2),
                "pnl_percent": f["profit_percent"],
                "logo_url": None
            })

        asset_allocations.sort(key=lambda x: x["value"], reverse=True)

        # Top altas e baixas (Renda Variável)
        gainers = sorted([p for p in var_positions if p["day_change_percent"] > 0], key=lambda x: x["day_change_percent"], reverse=True)[:5]
        losers = sorted([p for p in var_positions if p["day_change_percent"] < 0], key=lambda x: x["day_change_percent"])[:5]

        # Indicadores de Mercado
        indicators = BrapiService.get_market_indicators()

        return {
            "total_portfolio_value": round(total_current, 2),
            "total_invested": round(total_invested, 2),
            "total_profit": round(total_profit, 2),
            "total_profit_percent": round(total_profit_pct, 2),
            "day_pnl": round(total_day_pnl, 2),
            "day_pnl_percent": round(day_change_pct, 2),
            "total_dividends": round(var_dividends, 2),
            "total_realized_profit": round(var_realized, 2),
            
            "variable_income": {
                "invested": round(var_invested, 2),
                "current": round(var_current, 2),
                "profit": round(var_pnl, 2),
                "profit_percent": round(((var_current / var_invested) - 1.0) * 100.0, 2) if var_invested > 0 else 0.0,
                "count": len(var_positions)
            },
            "fixed_income": {
                "invested": round(fixed_invested, 2),
                "current": round(fixed_current, 2),
                "net_current": round(fixed_net_current, 2),
                "profit": round(fixed_pnl, 2),
                "profit_percent": round(((fixed_current / fixed_invested) - 1.0) * 100.0, 2) if fixed_invested > 0 else 0.0,
                "estimated_daily_gain": round(fixed_day_gain, 2),
                "count": len(fixed_positions)
            },
            
            "allocation_by_category": allocation_by_category,
            "top_assets": asset_allocations[:8],
            "gainers": gainers,
            "losers": losers,
            "market_indicators": indicators
        }

