#!/bin/bash

echo "======================================"
echo "Starting BSU Villa Harmonis Servers..."
echo "======================================"

# Start Backend
echo "[1/2] Starting Backend Server (Hono / Node.js)..."
cd backend
if [ -d "node_modules" ]; then
    npm run dev &
    BACKEND_PID=$!
    echo "Backend is running on http://localhost:8000 (PID: $BACKEND_PID)"
else
    echo "Installing backend dependencies..."
    npm install
    npm run dev &
    BACKEND_PID=$!
    echo "Backend is running on http://localhost:8000 (PID: $BACKEND_PID)"
fi

# Return to root directory
cd ..

# Start Frontend
echo "[2/2] Starting Frontend Server (Vite/React)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend is running (PID: $FRONTEND_PID)"

echo "======================================"
echo "All servers started! Press Ctrl+C to stop."
echo "======================================"

# Handle termination gracefully
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT SIGTERM

# Wait for processes to keep the script running
wait $BACKEND_PID $FRONTEND_PID
