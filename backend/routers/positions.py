from fastapi import APIRouter, Query
from backend.portfolio_service import PortfolioService

router = APIRouter(prefix="/api/positions", tags=["Positions"])

@router.get("")
def get_positions(refresh: bool = Query(False, description="Forçar atualização na Brapi")):
    return PortfolioService.get_variable_positions(force_refresh=refresh)

