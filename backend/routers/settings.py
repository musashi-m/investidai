from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.database import get_db
from backend.brapi_service import BrapiService

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    brapi_token: Optional[str] = None
    portfolio_name: Optional[str] = None
    auto_refresh_minutes: Optional[int] = None

@router.get("")
def get_settings():
    with get_db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        settings = {r["key"]: r["value"] for r in rows}
    
    token = settings.get("brapi_token", "")
    # Mascara o token para exibição segura se configurado
    masked_token = f"{token[:4]}...{token[-4:]}" if len(token) > 8 else ("Configurado" if token else "")

    return {
        "has_brapi_token": bool(token),
        "brapi_token_masked": masked_token,
        "brapi_token": token,
        "portfolio_name": settings.get("portfolio_name", "Minha Carteira"),
        "auto_refresh_minutes": int(settings.get("auto_refresh_minutes", 5))
    }

@router.post("")
def update_settings(data: SettingsUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        if data.brapi_token is not None:
            cursor.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES ('brapi_token', ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                (data.brapi_token.strip(),)
            )
        if data.portfolio_name is not None:
            cursor.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES ('portfolio_name', ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                (data.portfolio_name.strip(),)
            )
        if data.auto_refresh_minutes is not None:
            cursor.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES ('auto_refresh_minutes', ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                (str(data.auto_refresh_minutes),)
            )

    return {"message": "Configurações salvas com sucesso!"}

@router.get("/backup")
def export_backup():
    with get_db() as conn:
        txs = [dict(r) for r in conn.execute("SELECT * FROM transactions").fetchall()]
        fixed = [dict(r) for r in conn.execute("SELECT * FROM fixed_income_assets").fetchall()]
        divs = [dict(r) for r in conn.execute("SELECT * FROM dividends").fetchall()]
        settings = [dict(r) for r in conn.execute("SELECT * FROM settings").fetchall()]

    return {
        "version": "1.0",
        "exported_at": str(datetime.datetime.now()),
        "transactions": txs,
        "fixed_income_assets": fixed,
        "dividends": divs,
        "settings": settings
    }

@router.post("/clear-all")
def clear_all_data():
    """
    Limpa todos os dados da carteira para começar do zero.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions")
        cursor.execute("DELETE FROM fixed_income_assets")
        cursor.execute("DELETE FROM dividends")
        cursor.execute("DELETE FROM market_cache")
    return {"message": "Carteira limpa com sucesso!"}
