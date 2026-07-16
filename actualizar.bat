@echo off
echo Iniciando Riquesos...
start "" "http://localhost:3000"
echo.
echo Iniciando tunel publico...
echo Busca la linea que dice "https://xxxxx.trycloudflare.com"
echo Esa es tu URL publica para acceder desde cualquier lugar.
echo.
start "" npx cloudflared tunnel --url http://localhost:3000
call npx next dev -H 0.0.0.0