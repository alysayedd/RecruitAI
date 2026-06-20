# Railway Deployment

This repo deploys as **two Railway services** in one project: `backend` and `frontend`.

## 1. Create the Railway project

1. Go to https://railway.com → New Project → Deploy from GitHub repo → pick `alysayedd/RecruitAI`.
2. Railway will create one service by default. You will create a second one for the other folder.

## 2. Backend service

- **Settings → Source → Root Directory**: `backend`
- **Settings → Networking**: Generate a public domain (e.g. `recruitai-backend.up.railway.app`)
- **Variables**:
  - `CEREBRAS_API_KEY` = your Cerebras API key
  - `CEREBRAS_MODEL` = `gpt-oss-120b`
  - `CEREBRAS_BASE_URL` = `https://api.cerebras.ai/v1`
  - `SECRET_KEY` = a long random string
  - `CORS_ORIGINS` = `https://<your-frontend-domain>` (set after step 3, comma-separated for multiple)
  - `DATABASE_URL` = `sqlite+aiosqlite:////data/recruitment_ai.db` (only if you attach a volume; otherwise leave default)
  - `UPLOAD_DIR` = `/data/uploads` (only if you attach a volume)
  - SMTP_* vars if you want email
- **Volume (recommended)**: Settings → Volumes → New Volume, mount at `/data`. SQLite + uploads need persistent disk; Railway containers are ephemeral otherwise.

Railway auto-detects `backend/railway.json` and `backend/nixpacks.toml` and runs:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Health check: `/health`.

## 3. Frontend service

- **Settings → Source → Root Directory**: `frontend`
- **Settings → Networking**: Generate a public domain
- **Variables**:
  - `VITE_API_URL` = `https://<your-backend-domain>` (the URL from step 2)

Build/start come from `frontend/railway.json` (Vite build → `serve dist`).

After the frontend is live, go back to the backend service and put its URL into `CORS_ORIGINS`.

## 4. Local dev

Backend:
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:
```
cd frontend
npm install
npm run dev
```
