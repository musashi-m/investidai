import sqlite3
import os
from contextlib import contextmanager
from typing import Generator

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "carteira.db")

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tabela de Configurações do Sistema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de Cache do Mercado (Brapi)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_cache (
                symbol TEXT PRIMARY KEY,
                short_name TEXT,
                long_name TEXT,
                currency TEXT DEFAULT 'BRL',
                regular_market_price REAL,
                regular_market_change REAL,
                regular_market_change_percent REAL,
                regular_market_day_high REAL,
                regular_market_day_low REAL,
                regular_market_previous_close REAL,
                regular_market_volume REAL,
                market_cap REAL,
                logo_url TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de Renda Fixa (Ativos Fixos)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fixed_income_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                issuer TEXT NOT NULL,
                asset_type TEXT NOT NULL,          -- CDB, LCI, LCA, CRI, CRA, TESOURO_SELIC, TESOURO_IPCA, TESOURO_PREFIXADO, DEBENTURE, OUTRO
                indexer_type TEXT NOT NULL,        -- CDI, IPCA, PREFIXADO, SELIC
                indexer_rate REAL NOT NULL,        -- Ex: 110 (110% CDI), 6.5 (IPCA + 6.5%), 13.0 (13% a.a.)
                initial_amount REAL NOT NULL,      -- Valor investido original
                current_amount REAL NOT NULL,      -- Saldo atual com rendimentos
                start_date TEXT NOT NULL,          -- YYYY-MM-DD
                maturity_date TEXT,                -- YYYY-MM-DD (opcional para liquidez diária)
                liquidity_type TEXT DEFAULT 'NO_VENCIMENTO', -- DIARIA, NO_VENCIMENTO, CARENCIA
                is_tax_free INTEGER DEFAULT 0,     -- 1 para LCI/LCA/CRI/CRA (isento de IR), 0 para CDB/Tesouro
                status TEXT DEFAULT 'ATIVO',       -- ATIVO, RESGATADO, VENCIDO
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de Transações (Histórico de Compras, Vendas, Aportes, Resgates, Dividendos)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,            -- RENDA_VARIAVEL, RENDA_FIXA
                type TEXT NOT NULL,                -- COMPRA, VENDA, PROVENTO, APORTE, RESGATE
                asset_type TEXT NOT NULL,          -- ACAO, FII, BDR, ETF, CRIPTO, CDB, LCI, etc.
                ticker_or_name TEXT NOT NULL,      -- PETR4, MXRF11, CDB Nubank, etc.
                quantity REAL DEFAULT 0,           -- Qtd de cotas ou frações
                unit_price REAL DEFAULT 0,         -- Preço unitário pago ou recebido
                total_amount REAL NOT NULL,        -- Valor total financeiro da operação
                fees REAL DEFAULT 0,               -- Taxas (corretagem, B3, etc.)
                date TEXT NOT NULL,                -- YYYY-MM-DD
                fixed_income_id INTEGER,           -- Referência opcional para ativo de renda fixa
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fixed_income_id) REFERENCES fixed_income_assets(id) ON DELETE SET NULL
            )
        """)
        
        # Tabela de Proventos Recebidos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dividends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT NOT NULL,
                dividend_type TEXT NOT NULL,       -- DIVIDENDO, JCP, RENDIMENTO
                payment_date TEXT NOT NULL,        -- YYYY-MM-DD
                total_amount REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Configuração padrão caso não exista
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('brapi_token', '')")
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_refresh_minutes', '5')")
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('portfolio_name', 'Minha Carteira')")

