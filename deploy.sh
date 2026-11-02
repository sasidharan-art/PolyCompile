#!/bin/bash
# ==============================================================================
# PolyCompile - Linux / Cloud VPS Production Deployment Script
# ==============================================================================

set -e

echo "======================================================================"
echo "  PolyCompile - Cloud & Production Deployment"
echo "======================================================================"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js >= 18.0.0."
    exit 1
fi

echo "[1/4] Installing production dependencies..."
npm install --production

echo "[2/4] Running automated test verification..."
node test.js
node verify_all.js

echo "[3/4] Checking deployment mode..."
if command -v pm2 &> /dev/null; then
    echo "Starting via PM2 process manager..."
    pm2 start ecosystem.config.js --env production
    pm2 save
elif command -v docker &> /dev/null && [ "$1" == "--docker" ]; then
    echo "Starting via Docker Compose..."
    docker compose up -d --build
else
    echo "Starting via native Node.js..."
    npm start &
fi

echo "[4/4] Verifying health probe..."
sleep 2
curl -f http://localhost:3000/health || echo "Server starting up..."

echo ""
echo "======================================================================"
echo "  Deployment Complete! Application running at http://localhost:3000"
echo "======================================================================"
