from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.database import get_db

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

class TransactionCreate(BaseModel):
    category: str = Field(..., example="RENDA_VARIAVEL") # RENDA_VARIAVEL, RENDA_FIXA
    type: str = Field(..., example="COMPRA") # COMPRA, VENDA, PROVENTO, APORTE, RESGATE
    asset_type: str = Field(..., example="ACAO") # ACAO, FII, BDR, ETF, CRIPTO, CDB, etc.
    ticker_or_name: str = Field(..., example="PETR4")
    quantity: float = Field(0.0, ge=0)
    unit_price: float = Field(0.0, ge=0)
    total_amount: Optional[float] = None
    fees: float = Field(0.0, ge=0)
    date: str = Field(..., example="2026-02-10")
    fixed_income_id: Optional[int] = None
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    type: Optional[str] = None
    asset_type: Optional[str] = None
    ticker_or_name: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    fees: Optional[float] = None
    date: Optional[str] = None
    notes: Optional[str] = None

@router.get("")
def list_transactions(
    category: Optional[str] = None,
    type: Optional[str] = None,
    asset_type: Optional[str] = None,
    ticker: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000)
):
    with get_db() as conn:
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category.upper())
        if type:
            query += " AND type = ?"
            params.append(type.upper())
        if asset_type:
            query += " AND asset_type = ?"
            params.append(asset_type.upper())
        if ticker:
            query += " AND UPPER(ticker_or_name) LIKE ?"
            params.append(f"%{ticker.upper()}%")

        query += " ORDER BY date DESC, id DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

@router.post("")
def create_transaction(data: TransactionCreate):
    clean_ticker = data.ticker_or_name.strip().upper()
    total = data.total_amount
    if total is None or total <= 0:
        total = (data.quantity * data.unit_price) + data.fees

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (
                category, type, asset_type, ticker_or_name,
                quantity, unit_price, total_amount, fees, date,
                fixed_income_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.category.upper(), data.type.upper(),
            data.asset_type.upper(), clean_ticker,
            data.quantity, data.unit_price, total,
            data.fees, data.date, data.fixed_income_id, data.notes
        ))
        tx_id = cursor.lastrowid

        # Se for provento (dividendo/jcp/rendimento), também insere na tabela de dividendos
        if data.type.upper() == "PROVENTO":
            cursor.execute("""
                INSERT INTO dividends (ticker, dividend_type, payment_date, total_amount, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (clean_ticker, data.asset_type.upper(), data.date, total, data.notes))

    return {"id": tx_id, "message": "Operação registrada com sucesso!"}

@router.put("/{id}")
def update_transaction(id: int, data: TransactionUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        existing = cursor.execute("SELECT * FROM transactions WHERE id = ?", (id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Transação não encontrada")

        updates = []
        params = []
        if data.category is not None:
            updates.append("category = ?")
            params.append(data.category.upper())
        if data.type is not None:
            updates.append("type = ?")
            params.append(data.type.upper())
        if data.asset_type is not None:
            updates.append("asset_type = ?")
            params.append(data.asset_type.upper())
        if data.ticker_or_name is not None:
            updates.append("ticker_or_name = ?")
            params.append(data.ticker_or_name.strip().upper())
        if data.quantity is not None:
            updates.append("quantity = ?")
            params.append(data.quantity)
        if data.unit_price is not None:
            updates.append("unit_price = ?")
            params.append(data.unit_price)
        if data.total_amount is not None:
            updates.append("total_amount = ?")
            params.append(data.total_amount)
        if data.fees is not None:
            updates.append("fees = ?")
            params.append(data.fees)
        if data.date is not None:
            updates.append("date = ?")
            params.append(data.date)
        if data.notes is not None:
            updates.append("notes = ?")
            params.append(data.notes)

        if updates:
            sql = f"UPDATE transactions SET {', '.join(updates)} WHERE id = ?"
            params.append(id)
            cursor.execute(sql, params)

    return {"message": "Transação atualizada com sucesso"}

@router.delete("/{id}")
def delete_transaction(id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ?", (id,))
    return {"message": "Transação excluída com sucesso"}

