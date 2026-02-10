from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LangChain Chatbot API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# from app.routers import auth, chat, health
# app.include_router(health.router, prefix="/health", tags=["health"])
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/")
async def root():
    return {"message": "LangChain Chatbot API"}
