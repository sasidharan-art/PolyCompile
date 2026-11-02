#!/bin/bash
echo "======================================================================"
echo "  PolyCompile: Unified Multi-Language Compiler Platform"
echo "  Automatic Language Detection & Multi-Paradigm Execution System"
echo "======================================================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed! Please install Node.js."
    exit 1
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "[SETUP] Installing dependencies..."
    npm install express
fi

echo "[OK] Launching PolyCompile server on http://localhost:3000..."
# Attempt opening browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
    open http://localhost:3000 &
fi

node server.js
