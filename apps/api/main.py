from contextlib import asynccontextmanager
import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import documents, conversations, usage

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger("mshauri.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Mshauri AI application...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error("Database connection warning during init", error=str(e))
    yield
    logger.info("Shutting down Mshauri AI API...")

app = FastAPI(
    title="Mshauri AI API",
    description="AI legal and business document assistant for Kenyan SMEs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route handlers
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(usage.router, prefix="/usage", tags=["usage"])

@app.get("/health")
async def health_check():
    """Health check endpoint for container readiness and monitoring."""
    return {
        "status": "ok",
        "app": "Mshauri AI",
        "jurisdiction": "Kenya (SME Commercial Guidance)",
        "version": "1.0.0",
    }

if __name__ == "__main__":
    uvicorn.run(
        "apps.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )