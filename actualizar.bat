@echo off
echo Iniciando Riquesos...

if not exist node_modules (
    echo Primera vez: instalando dependencias...
    call npm install
    call npx prisma generate
    call npx prisma db push
    call npx prisma db seed
)

echo Iniciando servidor...
start "Riquesos Server" npm run dev
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"