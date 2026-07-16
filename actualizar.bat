@echo off
echo ============================================
echo   RIQUEOS - Actualizacion
echo ============================================
echo.

echo [1/4] Bajando cambios de GitHub...
git pull origin main
if %errorlevel% neq 0 (
    echo ERROR: Fallo git pull. Verifica tu conexion y credenciales.
    pause
    exit /b 1
)
echo.

echo [2/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo npm install.
    pause
    exit /b 1
)
echo.

echo [3/4] Sincronizando base de datos...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: Fallo prisma db push. Intentando reset...
    call npx prisma migrate reset --force
    if %errorlevel% neq 0 (
        echo ERROR: Fallo prisma migrate reset. Borra prisma\dev.db manualmente y vuelve a correr.
        pause
        exit /b 1
    )
)
echo.

echo [4/4] Cargando datos base...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo ERROR: Fallo el seed base.
    pause
    exit /b 1
)
echo.

echo ============================================
echo   Todo listo! Para levantar el servidor:
echo   npm run dev
echo   
echo   Abri en el navegador: http://localhost:3000
echo ============================================
pause