# RecruitAI — AI-Powered Recruitment Screening & Bias Analyzer

A multi-agent recruitment system that screens CVs with AI and audits its own decisions for bias. **100% free — no paid APIs.**

## Architecture

```
JD Parser → CV Screener → Bias Auditor → Ranker → Explainer
```

| Agent | Role |
|---|---|
| JD Parser | Extracts structured requirements from job descriptions |
| CV Screener | Scores each CV 0-100 with weighted breakdown (skills/exp/edu/extras) |
| Bias Auditor | Calculates Disparate Impact Ratios, flags gender/name-origin bias |
| Ranker | Produces final shortlist with optional bias correction |
| Explainer | Generates plain-English justifications and executive summary |

## Tech Stack (all free)

- **LLM**: Ollama + llama3.2 (runs locally)
- **Backend**: Python + FastAPI + async SQLAlchemy
- **Database**: SQLite (zero setup)
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Bias analytics**: Pandas + NumPy + feature importance
- **Reports**: ReportLab PDF generation

## Setup

### 1. Install Ollama
```bash
brew install ollama          # Mac
# or download from ollama.com for Windows/Linux

ollama pull llama3.2         # Download the model (~2GB, one time)
ollama serve                 # Keep this running
```

### 2. Run bootstrap
```bash
cd recruitment-ai
chmod +x bootstrap.sh
./bootstrap.sh
```

This creates the Python venv, installs dependencies, initializes the SQLite database, and loads 20 seed CVs.

### 3. Start backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 4. Start frontend
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

## Usage

1. Go to **New Job** → paste a job description → AI extracts requirements
2. Go to **Candidates** → upload CVs (PDF or TXT)
3. Click **Run Screening** → watch 5 agents process in real-time
4. Go to **Results** → view rankings, bias report, explanations
5. Download PDF report

## Testing Bias Detection

The seed data has 20 candidates with identical CVs but 10 Arabic names and 10 Western names. After running the pipeline:
- If the LLM is unbiased → Disparate Impact Ratio ≈ 1.0 (fair)
- If the LLM shows name bias → DIR < 0.8 (flagged)

This is the core academic experiment for your thesis.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/jobs | Create job, parse JD |
| GET | /api/jobs | List all jobs |
| POST | /api/jobs/{id}/candidates | Upload CVs |
| POST | /api/jobs/{id}/run | Run pipeline (SSE stream) |
| GET | /api/jobs/{id}/results | Get full results |
| GET | /api/jobs/{id}/report | Download PDF report |

## Project Structure

```
recruitment-ai/
├── backend/
│   ├── main.py
│   ├── agents/
│   │   ├── common.py         # Ollama LLM caller
│   │   ├── orchestrator.py   # Pipeline coordinator
│   │   ├── jd_parser.py
│   │   ├── cv_screener.py
│   │   ├── bias_auditor.py
│   │   ├── ranker.py
│   │   └── explainer.py
│   ├── models/
│   ├── services/
│   ├── api/
│   └── seed.py
└── frontend/
    └── src/
        ├── pages/
        └── components/
```
