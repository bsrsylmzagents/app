#!/bin/bash
echo "Starting Backend Server..."
echo ""
echo "Make sure MongoDB is running!"
echo ""
uvicorn server:app --reload --host 0.0.0.0 --port 8000









