@echo off
title Gerenciador de Investimentos
echo ========================================================
echo        GERENCIADOR DE INVESTIMENTOS (B3 ^& RF)
echo   Cotacoes em tempo real via Brapi (https://brapi.dev)
echo ========================================================
echo.
echo Iniciando o servidor na porta 8000...
start "" http://localhost:8000
python main.py
pause

