#!/bin/bash
# Script para iniciar todo el proyecto en macOS/Linux
# Uso: chmod +x run-dev.sh && ./run-dev.sh

set -e

echo ""
echo "====================================="
echo "  Internal Chat MVP - Dev Server"
echo "====================================="
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js no está instalado"
    echo "Descarga desde https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Verificar si Docker está instalado (opcional)
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker no está instalado - No se iniciará PostgreSQL"
    echo "Para base de datos local, instala Docker: https://www.docker.com/"
    read -p "¿Continuar sin base de datos? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    echo "✅ Docker encontrado"
    echo ""
    echo "[1/4] Iniciando PostgreSQL con Docker..."
    docker-compose up -d
    
    # Esperar a que PostgreSQL inicie
    echo "⏳ Esperando PostgreSQL..."
    sleep 5
fi

echo ""
echo "[2/4] Instalando dependencias del Backend..."
cd backend
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi
cd ..

echo ""
echo "[3/4] Iniciando Backend (NestJS)..."
echo "      (En nueva terminal)"
open -a Terminal "$(pwd)/backend" <<< "pnpm start:dev"

# Esperar a que el backend inicie
echo "⏳ Esperando Backend..."
sleep 10

echo ""
echo "[4/4] Iniciando Frontend (Next.js)..."
echo "      (En nueva terminal)"
open -a Terminal "$(pwd)" <<< "pnpm dev"

echo ""
echo "====================================="
echo "  ✅ ¡Todo iniciado!"
echo "====================================="
echo ""
echo "URLs disponibles:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend:     http://localhost:3001"
echo "  API Docs:    http://localhost:3001/docs"
echo "  pgAdmin:     http://localhost:5050"
echo ""
echo "====================================="
echo ""
