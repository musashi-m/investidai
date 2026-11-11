import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db
from backend.routers import dashboard, positions, fixed_income, transactions, market, settings

app = FastAPI(
    title="InvestManager — Gerenciador de Investimentos",
    description="Controle de carteira de ativos fixos e variáveis com cotações Brapi em tempo real.",
    version="1.0.0"
)

# CORS para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialização do banco de dados SQLite
init_db()

# Inclusão dos roteadores da API ANTES de qualquer rota estática
app.include_router(dashboard.router)
app.include_router(positions.router)
app.include_router(fixed_income.router)
app.include_router(transactions.router)
app.include_router(market.router)
app.include_router(settings.router)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "InvestManager", "brapi_active": True}

# Suporte ao frontend compilado (SPA)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    # Monta arquivos de assets estáticos (js, css, imagens)
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Se for uma rota de API inexistente, retorne 404 JSON em vez de index.html
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Endpoint da API não encontrado")

        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Rota de fallback para SPA React
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        return {"status": "ok", "message": "API do Gerenciador de Investimentos em execução"}

if __name__ == "__main__":
    print("Iniciando Gerenciador de Investimentos em http://localhost:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
