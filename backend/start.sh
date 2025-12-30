#!/bin/bash
# Start script for ARENA backend server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting ARENA Backend Server...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo -e "${YELLOW}   Please create .env file with required environment variables${NC}"
    echo -e "${YELLOW}   You can copy .env.example if it exists${NC}"
    echo ""
fi

# Check if dependencies are installed
if [ ! -d ".venv" ] && ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}⚠️  Dependencies may not be installed${NC}"
    echo -e "${YELLOW}   Run: ./setup.sh or uv sync${NC}"
    echo ""
fi

# Default values
HOST=${HOST:-"0.0.0.0"}
PORT=${PORT:-8000}
RELOAD=${RELOAD:-"--reload"}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --no-reload)
            RELOAD=""
            shift
            ;;
        --help)
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --host HOST       Host to bind to (default: 0.0.0.0)"
            echo "  --port PORT       Port to bind to (default: 8000)"
            echo "  --no-reload       Disable auto-reload (for production)"
            echo "  --help            Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  HOST              Host to bind to (overrides --host)"
            echo "  PORT              Port to bind to (overrides --port)"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}✓ Starting server on http://${HOST}:${PORT}${NC}"
echo -e "${BLUE}📚 API Documentation:${NC}"
echo -e "   Swagger UI:  http://localhost:${PORT}/docs"
echo -e "   ReDoc:       http://localhost:${PORT}/redoc"
echo -e "   OpenAPI:     http://localhost:${PORT}/openapi.json"
echo ""

# Start the server using uv
if command -v uv &> /dev/null; then
    uv run uvicorn arena.main:app --host "$HOST" --port "$PORT" $RELOAD
else
    echo -e "${YELLOW}⚠️  uv not found, trying python -m uvicorn...${NC}"
    python -m uvicorn arena.main:app --host "$HOST" --port "$PORT" $RELOAD
fi
