# Backend

FastAPI API and LangChain agent (Gemini) with Tavily and Google Trends MCP tools.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set variables in `.env` (see `.env.example`): Supabase, Gemini, Tavily, MCP URL.

## Main routes

- `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`
- `GET /chat/conversations`, `POST /chat/conversations`, `POST /chat/conversations/{id}/messages`
