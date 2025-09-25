"""
Audio Processing Studio Backend
FastAPI application with pyannote.ai integration
"""

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.endpoints import diarization, webhooks

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Audio Processing Studio Backend",
    description="Backend API for modular audio processing with pyannote.ai integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(diarization.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting Audio Processing Studio Backend...")
    
    # Create necessary directories
    upload_dir = Path(settings.upload_dir)
    temp_dir = Path(settings.temp_dir)
    
    upload_dir.mkdir(exist_ok=True)
    temp_dir.mkdir(exist_ok=True)
    
    logger.info(f"Upload directory: {upload_dir.absolute()}")
    logger.info(f"Temp directory: {temp_dir.absolute()}")
    
    # Test pyannote.ai connection
    try:
        from app.services.pyannote_client import pyannote_client
        is_valid = await pyannote_client.test_api_key()
        
        if is_valid:
            logger.info("✅ pyannote.ai API connection successful")
        else:
            logger.error("❌ pyannote.ai API key invalid")
    except Exception as e:
        logger.error(f"❌ Failed to test pyannote.ai connection: {e}")
    
    logger.info("🚀 Backend startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    logger.info("Shutting down Audio Processing Studio Backend...")
    
    # Close pyannote client
    try:
        from app.services.pyannote_client import pyannote_client
        await pyannote_client.close()
        logger.info("✅ pyannote.ai client closed")
    except Exception as e:
        logger.error(f"Error closing pyannote client: {e}")
    
    logger.info("👋 Backend shutdown complete")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Audio Processing Studio Backend",
        "version": "1.0.0",
        "description": "Backend API for modular audio processing with pyannote.ai integration",
        "docs_url": "/docs",
        "endpoints": {
            "diarization": "/api/diarization",
            "webhooks": "/api/webhooks",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        from app.services.pyannote_client import pyannote_client
        api_status = await pyannote_client.test_api_key()
        
        return {
            "status": "healthy",
            "pyannote_api": "connected" if api_status else "disconnected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "error": str(e),
                "version": "1.0.0"
            },
            status_code=503
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        },
        status_code=500
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )
