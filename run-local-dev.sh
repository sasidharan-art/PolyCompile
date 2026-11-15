#!/usr/bin/env bash
echo "====================================================================="
echo " PolyCompile — Local Development Launcher (No Docker Required)"
echo " WARNING: Code executes directly on this machine - Development only!"
echo "====================================================================="

export LOCAL_DEV_MODE=true
export LOCAL_GATEWAY_MODE=true
export PORT=3000
export LOCAL_DEV_PORT=8081
export INTERACTIVE_GATEWAY_URL=ws://localhost:8081

echo "[1/2] Starting PolyCompile Local Development Gateway on port 8081..."
node local-dev-gateway.js &
GATEWAY_PID=$!

sleep 1

echo "[2/2] Starting PolyCompile Web Application on port 3000..."
node server.js &
SERVER_PID=$!

echo ""
echo "====================================================================="
echo " PolyCompile is now running!"
echo " Web Interface:       http://localhost:3000"
echo " Interactive Gateway: ws://localhost:8081"
echo "====================================================================="
echo "Press Ctrl+C to stop both servers."

trap "kill $GATEWAY_PID $SERVER_PID 2>/dev/null; exit 0" INT TERM EXIT
wait
