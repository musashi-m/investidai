from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.database import get_db
from backend.portfolio_service import PortfolioService

router = APIRouter(prefix="/api/fixed-income", tags=["Fixed Income"])

class FixedIncomeCreate(BaseModel):
    name: str = Field(..., example="CDB Banco Inter")
    issuer: str = Field(..., example="Banco Inter")
    asset_type: str = Field(..., example="CDB") # CDB, LCI, LCA, CRI, CRA, TESOURO_SELIC, TESOURO_IPCA, TESOURO_PREFIXADO, DEBENTURE, OUTRO
    indexer_type: str = Field(..., example="CDI") # CDI, IPCA, PREFIXADO, SELIC
    indexer_rate: float = Field(..., example=110.0) # ex: 110 (%) ou 6.5 (%)
    initial_amount: float = Field(..., gt=0, example=5000.0)
    current_amount: Optional[float] = None
    start_date: str = Field(..., example="2026-01-15")
    maturity_date: Optional[str] = None
    liquidity_type: str = Field("NO_VENCIMENTO", example="DIARIA") # DIARIA, NO_VENCIMENTO, CARENCIA
    is_tax_free: bool = False
    notes: Optional[str] = None

class FixedIncomeUpdate(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    asset_type: Optional[str] = None
    indexer_type: Optional[str] = None
    indexer_rate: Optional[float] = None
    current_amount: Optional[float] = None
    maturity_date: Optional[str] = None
    liquidity_type: Optional[str] = None
    is_tax_free: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class BalanceUpdate(BaseModel):
    current_amount: float = Field(..., gt=0)

@router.get("")
def list_fixed_income():
    return PortfolioService.get_fixed_income_positions()

@router.post("")
def create_fixed_income(data: FixedIncomeCreate):
    current_amt = data.current_amount if data.current_amount is not None else data.initial_amount
    tax_free_int = 1 if data.is_tax_free else 0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO fixed_income_assets (
                name, issuer, asset_type, indexer_type, indexer_rate,
                initial_amount, current_amount, start_date, maturity_date,
                liquidity_type, is_tax_free, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO', ?)
        """, (
            data.name, data.issuer, data.asset_type.upper(),
            data.indexer_type.upper(), data.indexer_rate,
            data.initial_amount, current_amt,
            data.start_date, data.maturity_date,
            data.liquidity_type.upper(), tax_free_int, data.notes
        ))
        asset_id = cursor.lastrowid

        # Cria transação de aporte automático correspondente
        cursor.execute("""
            INSERT INTO transactions (
                category, type, asset_type, ticker_or_name,
                quantity, unit_price, total_amount, fees, date,
                fixed_income_id, notes
            ) VALUES (
                'RENDA_FIXA', 'APORTE', ?, ?,
                1, ?, ?, 0, ?,
                ?, 'Aplicação inicial'
            )
        """, (
            data.asset_type.upper(), data.name,
            data.initial_amount, data.initial_amount,
            data.start_date, asset_id
        ))

    return {"id": asset_id, "message": "Ativo de renda fixa criado com sucesso!"}

@router.put("/{id}")
def update_fixed_income(id: int, data: FixedIncomeUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        existing = cursor.execute("SELECT * FROM fixed_income_assets WHERE id = ?", (id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Ativo não encontrado")

        updates = []
        params = []
        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.issuer is not None:
            updates.append("issuer = ?")
            params.append(data.issuer)
        if data.asset_type is not None:
            updates.append("asset_type = ?")
            params.append(data.asset_type.upper())
        if data.indexer_type is not None:
            updates.append("indexer_type = ?")
            params.append(data.indexer_type.upper())
        if data.indexer_rate is not None:
            updates.append("indexer_rate = ?")
            params.append(data.indexer_rate)
        if data.current_amount is not None:
            updates.append("current_amount = ?")
            params.append(data.current_amount)
        if data.maturity_date is not None:
            updates.append("maturity_date = ?")
            params.append(data.maturity_date)
        if data.liquidity_type is not None:
            updates.append("liquidity_type = ?")
            params.append(data.liquidity_type.upper())
        if data.is_tax_free is not None:
            updates.append("is_tax_free = ?")
            params.append(1 if data.is_tax_free else 0)
        if data.status is not None:
            updates.append("status = ?")
            params.append(data.status.upper())
        if data.notes is not None:
            updates.append("notes = ?")
            params.append(data.notes)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE fixed_income_assets SET {', '.join(updates)} WHERE id = ?"
            params.append(id)
            cursor.execute(sql, params)

    return {"message": "Ativo atualizado com sucesso"}

@router.post("/{id}/update-balance")
def update_balance(id: int, data: BalanceUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        existing = cursor.execute("SELECT * FROM fixed_income_assets WHERE id = ?", (id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Ativo não encontrado")
        cursor.execute("UPDATE fixed_income_assets SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (data.current_amount, id))

    return {"message": "Saldo atualizado com sucesso"}

@router.delete("/{id}")
def delete_fixed_income(id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM fixed_income_assets WHERE id = ?", (id,))
        cursor.execute("DELETE FROM transactions WHERE fixed_income_id = ?", (id,))
    return {"message": "Ativo excluído com sucesso"}

