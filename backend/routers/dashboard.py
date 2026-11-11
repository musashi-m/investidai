from fastapi import APIRouter, Query
from backend.portfolio_service import PortfolioService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard(refresh: bool = Query(False, description="Forçar atualização na Brapi")):
    return PortfolioService.get_dashboard_summary(force_refresh=refresh)

