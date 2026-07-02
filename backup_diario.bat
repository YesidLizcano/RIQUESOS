@echo off
chcp 65001 >nul
title Backup Diario - Riquesos

echo ========================================
echo   Backup Diario - Riquesos
echo ========================================
echo.

echo Ejecutando backup...
call npx tsx scripts/backup.ts

if %errorlevel% equ 0 (
    echo.
    echo [OK] Backup completado exitosamente.
) else (
    echo.
    echo [ERROR] El backup falló. Revise los mensajes anteriores.
)

echo.
pause
