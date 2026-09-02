#!/bin/bash

echo "======================================"
echo "Starting BSU Villa Harmonis Servers..."
echo "======================================"

# Start Backend
echo "[1/2] Starting Backend Server (FastAPI)..."
cd backend
# Check if venv exists
if [ -d "venv" ]; then
    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "Backend is running on http://localhost:8000 (PID: $BACKEND_PID)"
else
    echo "Error: Virtual environment 'venv' not found in backend directory."
    exit 1
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
