# CodeXa

AI-powered coding assistant and code review platform: **Monaco editor** + **Hugging Face Inference** (FastAPI + Router chat completions; default **Qwen2.5-Coder**) + **Firebase** (auth + Firestore).

## Features

- Landing, login/signup, password reset (Firebase email link), Google sign-in, **demo mode** without Firebase
- **Workspace**: C / C++ / Python / Java, Monaco, AI review with inline highlights, Copilot-style chat with **Apply proposed code**
- **Dashboard**: score history + issue trends (Recharts), backed by `/metrics` (extend with Firestore)

## Repository layout

```
SEPM_AI/
├── frontend/          # React + TypeScript + Vite + Tailwind v4 + Monaco + Recharts
├── backend/           # FastAPI + HF Router (httpx → chat completions)
└── README.md
```

## Prerequisites

- Node 20+
- Python 3.11+
- Hugging Face **access token** with inference access ([token settings](https://huggingface.co/settings/tokens))
- At least one **Inference Provider** enabled for your account ([inference providers](https://huggingface.co/settings/inference-providers)) so the [Inference Router](https://huggingface.co/docs/inference-providers/en/index) can run the model
- Firebase project (optional for demo; required for real auth)

### Hugging Face “model not supported by any provider”

- Turn on providers under [Inference Providers](https://huggingface.co/settings/inference-providers). Without this, the Router returns **400** for many models.
- **Not every model on the Hub runs on the Router.** For example, `deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct` is often unavailable there even with providers enabled. Use a model that appears in the [Playground](https://huggingface.co/playground), or DeepSeek’s own [API](https://platform.deepseek.com/) for that model.
- Override **`HF_MODEL_ID`** in `backend/.env` (default in this repo: `Qwen/Qwen2.5-Coder-7B-Instruct:fastest`).

## Run everything at once (recommended)

From the **repository root** (`SEPM_AI/`):

1. Install Python deps once: `cd backend` → `pip install -r requirements.txt` (or use a venv).
2. Create `backend/.env` with `HF_TOKEN=...` (see below).
3. Optional: copy `frontend/.env.example` → `frontend/.env` and set `VITE_API_URL=http://localhost:8000`.
4. Install Node deps at root (adds `concurrently`) and ensure the frontend is installed:

   ```bash
   npm install
   npm install --prefix frontend
   ```

5. Start **API + Vite** together:

   ```bash
   npm run dev
   ```

- UI: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:8000](http://localhost:8000) · docs: [http://localhost:8000/docs](http://localhost:8000/docs)

Stop with `Ctrl+C` once (stops both processes).

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create `backend/.env`:

```env
HF_TOKEN=your_hf_token_here
# Must be a model the Router serves (see Playground). Example:
# HF_MODEL_ID=Qwen/Qwen2.5-Coder-7B-Instruct:fastest
# CORS for deployed frontends (comma-separated)
# CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

Run:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API

| Method | Path | Body / query | Description |
|--------|------|--------------|-------------|
| `GET` | `/health` | — | Health check |
| `POST` | `/review-code` | `{ "code": "...", "language": "python" }` | Structured JSON review |
| `POST` | `/chat` | `{ "code", "language", "messages": [{ "role", "content" }] }` | Assistant JSON (`message`, `proposed_code`, `apply_ready`) |
| `GET` | `/metrics` | `?user_id=` optional | Sample metrics for charts |

## Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env` (optional):

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

```bash
npm run dev
```

Open `http://localhost:5173`. Use **Try demo** on the login page if Firebase is not configured.

### Logo asset

Brand image path: `frontend/public/assets/logo/sample.jpeg` (PNG data is acceptable; replace with a true JPEG if you prefer).

## Firebase (Firestore schema)

Collections used by the app:

| Collection | Purpose |
|------------|---------|
| `users` | Profile doc on signup/login (`uid` document) |
| `reviews` | Optional rows after each AI review (`saveReviewRecord`) |
| `submissions` | *(reserved)* batch submissions |
| `chat_history` | *(reserved)* persisted threads |
| `metrics` | *(reserved)* aggregated stats |

Configure Firestore security rules and indexes for production.

## Deployment

- **Frontend**: Vercel (build `frontend`, output `dist`, env vars as above).
- **Backend**: Render / Railway / Fly.io with `HF_TOKEN`, optional `HF_MODEL_ID`, and `CORS_ORIGINS` set.

## License

MIT (adjust as needed for your course/portfolio).
