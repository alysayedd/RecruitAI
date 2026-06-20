# RecruitAI — AI-Powered Recruitment Screening & Bias Analyzer

A multi-agent recruitment system that screens CVs with AI and audits its own decisions for bias. Powered by **Cerebras (gpt-oss-120b)**.

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

## Tech Stack

- **LLM**: Cerebras cloud inference running gpt-oss-120b (fast, reliable JSON via OpenAI-compatible API)
- **Backend**: Python + FastAPI + async SQLAlchemy
- **Database**: SQLite (zero setup)
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Bias analytics**: Pandas + NumPy + feature importance
- **Reports**: ReportLab PDF generation

## Why a Hosted 70B Model

The pipeline requires strict JSON output and deterministic scoring for the bias audit to be meaningful. Small local models (≤7B) produce ~30% invalid JSON and ±10-25 point variance on identical CVs, which makes Disparate Impact Ratio calculations unreliable. A hosted 70B model gives:

- **Reliable JSON** via OpenAI-compatible JSON mode (~99%+ valid)
- **Consistent scoring** (±2-5 point variance) — required for fair bias measurement
- **Strong instruction following** for multi-rule rubrics
- **Fast throughput** — Cerebras serves gpt-oss-120b at very high tokens/sec, full 20-CV pipeline in ~30s

The provider is swappable via `.env` — see "Swapping models" below.

## Setup

### 1. Get a Cerebras API Key
Go to [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key.

### 2. Configure the Backend
Create a `.env` file in the `backend/` directory:
```env
CEREBRAS_API_KEY=csk-your-key-here
CEREBRAS_MODEL=gpt-oss-120b
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
```

### Swapping models
The LLM layer uses an OpenAI-compatible client, so you can swap providers by changing the three env vars above. Tested alternatives:

| Provider | `BASE_URL` | Example `MODEL` |
|---|---|---|
| Cerebras (default) | `https://api.cerebras.ai/v1` | `gpt-oss-120b`, `llama-3.3-70b` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Local (Ollama) | `http://localhost:11434/v1` | `llama3.1:70b` |

### 3. Run bootstrap
```bash
cd recruitment-ai
chmod +x bootstrap.sh
./bootstrap.sh
```

This creates the Python venv, installs dependencies, initializes the SQLite database, and loads 20 seed CVs.

### 4. Start backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 5. Start frontend
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

This is the core academic experiment for the thesis.

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
│   ├── .env                 # Cerebras API key config
│   ├── agents/
│   │   ├── common.py        # LLM caller (OpenAI-compatible → Cerebras by default)
│   │   ├── orchestrator.py  # Pipeline coordinator
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
