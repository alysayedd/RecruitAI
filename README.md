# RecruitAI — AI-Powered Recruitment Screening & Bias Analyzer

A multi-agent recruitment system that screens CVs with AI and audits its own decisions for bias. Powered by **Groq (Llama 3.3 70B)**.

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

- **LLM**: Groq cloud inference running Llama 3.3 70B (fast, free tier, reliable JSON via OpenAI-compatible API)
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
- **Fast throughput** — Groq serves Llama 3.3 70B at ~300 tok/s, full 20-CV pipeline in ~30s
- **Free tier** that's enough for development (30 req/min, no card required)

The provider is swappable via `.env` — see "Swapping models" below.

## Setup

### 1. Get a Groq API Key
Go to [console.groq.com/keys](https://console.groq.com/keys) and create a free API key.

### 2. Configure the Backend
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=gsk_your-key-here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

### Swapping models
The LLM layer uses an OpenAI-compatible client, so you can swap providers by changing the three env vars above. Tested alternatives:

| Provider | `BASE_URL` | Example `MODEL` |
|---|---|---|
| Groq (default) | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Local (Ollama) | `http://localhost:11434/v1` | `llama3.1:70b` |

(Rename the env var prefix in `config.py` to match your provider, or leave it as `GROQ_*` — only the values matter.)

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
│   ├── .env                 # Groq API key config
│   ├── agents/
│   │   ├── common.py        # LLM caller (OpenAI-compatible → Groq by default)
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
