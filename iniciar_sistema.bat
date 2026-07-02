@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Backoffice Riquesos

echo ========================================
echo   Backoffice Riquesos - Inicio
echo ========================================
echo.

:: Step 1: Check Node.js
where node >nul 2>&1
if "!errorlevel!" neq "0" (
    echo [ERROR] Node.js no esta instalado.
    echo Instale Node.js 20+ desde https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

:: Step 2: Install dependencies if needed
if not exist "node_modules\" (
    echo.
    echo Instalando dependencias...
    call npm install
    if "!errorlevel!" neq "0" (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas
) else (
    echo [OK] Dependencias ya instaladas
)

:: Step 3: Run migrations
echo.
echo Ejecutando migraciones de base de datos...
call npx prisma migrate deploy
if "!errorlevel!" neq "0" (
    echo [ERROR] Fallo la migracion.
    pause
    exit /b 1
)
echo [OK] Migraciones aplicadas

:: Step 4: Always build (ensures latest code after git pull)
echo.
echo Compilando la aplicacion - puede tardar unos minutos...
call npx next build
if "!errorlevel!" neq "0" (
    echo [ERROR] Fallo la compilacion.
    pause
    exit /b 1
)
echo [OK] Aplicacion compilada

:: Step 5: Start server
echo.
echo ========================================
echo   Iniciando servidor en http://localhost:3000
echo   Presione Ctrl+C para detener
echo ========================================
echo.
call npx next start
endlocal