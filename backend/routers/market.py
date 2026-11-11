from fastapi import APIRouter, Query
from backend.brapi_service import BrapiService, POPULAR_TICKERS
from backend.database import get_db

router = APIRouter(prefix="/api/market", tags=["Market & Brapi"])

@router.get("/quote/{symbol}")
def get_quote(symbol: str, refresh: bool = Query(False)):
    quotes = BrapiService.fetch_quotes([symbol], force=refresh)
    if symbol.upper() in quotes:
        return quotes[symbol.upper()]
    return {"symbol": symbol.upper(), "regular_market_price": 0.0, "message": "Cotação não disponível ou token necessário"}

@router.post("/refresh")
def refresh_all_quotes():
    # Coleta todos os tickers distintos em carteira
    with get_db() as conn:
        rows = conn.execute("""
            SELECT DISTINCT ticker_or_name FROM transactions 
            WHERE category = 'RENDA_VARIAVEL'
        """).fetchall()
        tickers = [r["ticker_or_name"] for r in rows]

    if not tickers:
        return {"updated_count": 0, "message": "Nenhum ativo variável cadastrado para atualizar"}

    quotes = BrapiService.fetch_quotes(tickers, force=True)
    return {"updated_count": len(quotes), "tickers": list(quotes.keys())}

@router.get("/search")
def search_tickers(q: str = Query("", min_length=1)):
    query = q.strip().upper()
    matches = [
        t for t in POPULAR_TICKERS
        if query in t["symbol"] or query in t["name"].upper()
    ]
    return matches[:10]

@router.get("/indicators")
def get_indicators():
    return BrapiService.get_market_indicators()

