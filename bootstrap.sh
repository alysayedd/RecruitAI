#!/usr/bin/env bash
set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   RecruitAI Bootstrap (Free / Local)   ║"
echo "╚════════════════════════════════════════╝"
echo ""

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
cd "$BACKEND_DIR"

# Prefer 3.12/3.13: 3.14+ often lacks wheels for pydantic-core and other native deps.
PYTHON_BIN="$(command -v python3.13 2>/dev/null || command -v python3.12 2>/dev/null || command -v python3)"
if [ -z "$PYTHON_BIN" ]; then
  echo "  ✗ No python3 found on PATH"
  exit 1
fi
echo "  Using Python: $PYTHON_BIN ($("$PYTHON_BIN" --version 2>&1))"

# ── Python venv ───────────────────────────────────────────────────────────────
echo "▶ Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
  "$PYTHON_BIN" -m venv venv
  echo "  ✓ Created venv"
else
  echo "  ✓ venv already exists"
fi

source venv/bin/activate
echo "  ✓ Activated venv"

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "▶ Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "  ✓ Dependencies installed"

# ── .env file ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Checking .env file..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  ✓ Created .env from .env.example"
  echo "  ⚠ Using SQLite — no database setup needed"
else
  echo "  ✓ .env already exists"
fi

# ── Init DB (SQLite auto-creates) ─────────────────────────────────────────────
echo ""
echo "▶ Initializing SQLite database..."
python3 -c "
import asyncio
import sys
sys.path.insert(0, '.')
from models.database import init_db
asyncio.run(init_db())
print('  ✓ Database tables created')
"

# ── Seed data ─────────────────────────────────────────────────────────────────
echo ""
echo "▶ Loading seed data (20 synthetic CVs)..."
python3 seed.py

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Bootstrap complete! Now run:                         ║"
echo "║                                                        ║"
echo "║   Terminal 1 — Backend:                               ║"
echo "║     cd backend && source venv/bin/activate            ║"
echo "║     uvicorn main:app --reload                         ║"
echo "║                                                        ║"
echo "║   Terminal 2 — Frontend:                              ║"
echo "║     cd frontend && npm install && npm run dev         ║"
echo "║                                                        ║"
echo "║   Also make sure Ollama is running:                   ║"
echo "║     ollama serve  (in a separate terminal)            ║"
echo "║     ollama pull llama3.2  (first time only)           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
