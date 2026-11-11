Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GERENCIADOR DE INVESTIMENTOS (B3 & RF)" -ForegroundColor Green
Write-Host "  Cotacoes em tempo real via Brapi (https://brapi.dev)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando em http://localhost:8000 ..." -ForegroundColor White

Start-Process "http://localhost:8000"
python main.py

