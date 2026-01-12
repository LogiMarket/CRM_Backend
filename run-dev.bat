@echo off
REM Script para iniciar todo el proyecto en Windows
REM Uso: run-dev.bat

setlocal enabledelayedexpansion

echo.
echo =====================================
echo   Internal Chat MVP - Dev Server
echo =====================================
echo.

REM Verificar si Node.js está instalado
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js no está instalado
    echo Descarga desde https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Iniciando PostgreSQL con Docker...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Docker no está disponible
    echo Instala Docker desde https://www.docker.com/
    pause
    exit /b 1
)

REM Esperar a que PostgreSQL inicie
timeout /t 5 /nobreak

echo.
echo [2/4] Iniciando Backend (NestJS)...
start "Backend NestJS" cmd /k "cd backend && pnpm install && pnpm start:dev"

REM Esperar a que el backend inicie
timeout /t 10 /nobreak

echo.
echo [3/4] Iniciando Frontend (Next.js)...
start "Frontend Next.js" cmd /k "pnpm dev"

echo.
echo [4/4] ¡Todo iniciado!"
echo.
echo =====================================
echo   URLs disponibles:
echo =====================================
echo.
echo   Frontend:    http://localhost:3000
echo   Backend:     http://localhost:3001
echo   API Docs:    http://localhost:3001/docs
echo   pgAdmin:     http://localhost:5050
echo.
echo =====================================
echo.
echo Presiona una tecla para continuar...
pause

endlocal
