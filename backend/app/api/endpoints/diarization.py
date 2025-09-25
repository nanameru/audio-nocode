"""
Diarization API endpoints.
Implements pyannote.ai integration for speaker diarization.
"""

import logging
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models.pyannote_models import (
    DiarizationRequest,
    JobCreationResponse,
    JobStatus,
    ProcessingJob,
    PyannoteError
)
from app.services.pyannote_client import pyannote_client, PyannoteAPIError, RateLimitExceeded

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diarization", tags=["diarization"])

# In-memory job storage (in production, use Redis or database)
active_jobs: dict[str, ProcessingJob] = {}


@router.get("/test")
async def test_pyannote_connection():
    """
    Test pyannote.ai API connection and authentication.
    Based on: https://docs.pyannote.ai/api-reference/test
    """
    try:
        is_valid = await pyannote_client.test_api_key()
        
        if is_valid:
            return {
                "status": "success",
                "message": "pyannote.ai API connection successful",
                "api_key_valid": True
            }
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid pyannote.ai API key"
            )
            
    except Exception as e:
        logger.error(f"API test failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test API connection: {str(e)}"
        )


@router.post("/upload", response_model=JobCreationResponse)
async def upload_and_diarize(
    file: UploadFile = File(...),
    webhook_url: Optional[str] = None,
    wait_for_completion: bool = False,
    model: Optional[str] = "precision-2",
    num_speakers: Optional[int] = None,
    min_speakers: Optional[int] = None,
    max_speakers: Optional[int] = None,
    turn_level_confidence: bool = False,
    exclusive: bool = False,
    confidence: bool = False
):


@router.post("/upload-pyannote31", response_model=JobCreationResponse)
async def upload_and_diarize_pyannote31(
    file: UploadFile = File(...),
    webhook_url: Optional[str] = None,
    wait_for_completion: bool = False,
    num_speakers: Optional[int] = None,
    min_speakers: Optional[int] = None,
    max_speakers: Optional[int] = None,
    use_gpu: bool = True,
    progress_monitoring: bool = True,
    memory_optimized: bool = False
):
    """
    Upload audio file and start pyannote 3.1 diarization.
    
    Args:
        file: Audio file to process
        webhook_url: Optional webhook URL for results
        wait_for_completion: Whether to wait for job completion
        num_speakers: Exact number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers
        use_gpu: Enable GPU acceleration
        progress_monitoring: Enable detailed progress monitoring
        memory_optimized: Use memory-optimized processing
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an audio file"
        )
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    try:
        # Save uploaded file temporarily
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(exist_ok=True)
        
        file_extension = Path(file.filename).suffix if file.filename else ".wav"
        temp_file_path = upload_dir / f"{job_id}{file_extension}"
        
        # Write file to disk
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Saved uploaded file for pyannote 3.1: {temp_file_path}")
        
        # Create processing job record
        processing_job = ProcessingJob(
            id=job_id,
            pyannote_job_id="",  # Will be set after API call
            status="uploading",
            file_path=str(temp_file_path),
            webhook_url=webhook_url
        )
        active_jobs[job_id] = processing_job
        
        # Start pyannote 3.1 diarization with enhanced parameters
        try:
            # Build parameters for pyannote 3.1
            diarization_params = {
                "model": "precision-3",  # Use latest model
                "webhook_url": webhook_url,
                "wait_for_completion": wait_for_completion
            }
            
            # Add speaker constraints
            if num_speakers is not None:
                diarization_params["num_speakers"] = num_speakers
            else:
                if min_speakers is not None:
                    diarization_params["min_speakers"] = min_speakers
                if max_speakers is not None:
                    diarization_params["max_speakers"] = max_speakers
            
            # Add pyannote 3.1 specific features
            diarization_params.update({
                "use_gpu": use_gpu,
                "progress_monitoring": progress_monitoring,
                "memory_optimized": memory_optimized,
                "enhanced_features": True  # Enable pyannote 3.1 features
            })
            
            job_status = await pyannote_client.diarize_file(
                file_path=temp_file_path,
                **diarization_params
            )
            
            # Update job record
            processing_job.pyannote_job_id = job_status.jobId
            processing_job.status = job_status.status
            
            if wait_for_completion and job_status.output:
                processing_job.result = job_status.output
            
            return JobCreationResponse(
                jobId=job_id,
                status=job_status.status,
                message=f"pyannote 3.1 diarization {'completed' if wait_for_completion else 'started'} successfully"
            )
            
        except RateLimitExceeded as e:
            processing_job.status = "rate_limited"
            processing_job.error_message = f"Rate limit exceeded. Retry after {e.retry_after} seconds."
            
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": e.retry_after,
                    "limit": e.limit,
                    "remaining": e.remaining
                }
            )
            
        except PyannoteAPIError as e:
            processing_job.status = "failed"
            processing_job.error_message = str(e)
            
            raise HTTPException(
                status_code=e.status_code or 500,
                detail=f"pyannote 3.1 API error: {e.message}"
            )
            
    except Exception as e:
        logger.error(f"Failed to process pyannote 3.1 upload: {e}")
        
        # Update job status if it exists
        if job_id in active_jobs:
            active_jobs[job_id].status = "failed"
            active_jobs[job_id].error_message = str(e)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file with pyannote 3.1: {str(e)}"
        )


@router.post("/upload", response_model=JobCreationResponse)
async def upload_and_diarize(
    file: UploadFile = File(...),
    webhook_url: Optional[str] = None,
    wait_for_completion: bool = False,
    model: Optional[str] = "precision-2",
    num_speakers: Optional[int] = None,
    min_speakers: Optional[int] = None,
    max_speakers: Optional[int] = None,
    turn_level_confidence: bool = False,
    exclusive: bool = False,
    confidence: bool = False
):
    """
    Upload audio file and start diarization.
    
    Args:
        file: Audio file to process
        webhook_url: Optional webhook URL for results
        wait_for_completion: Whether to wait for job completion
        model: Model to use (precision-1 or precision-2)
        num_speakers: Number of speakers (if known)
        min_speakers: Minimum number of speakers
        max_speakers: Maximum number of speakers
        turn_level_confidence: Include turn-level confidence
        exclusive: Include exclusive diarization
        confidence: Include confidence scores
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an audio file"
        )
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    try:
        # Save uploaded file temporarily
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(exist_ok=True)
        
        file_extension = Path(file.filename).suffix if file.filename else ".wav"
        temp_file_path = upload_dir / f"{job_id}{file_extension}"
        
        # Write file to disk
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Saved uploaded file: {temp_file_path}")
        
        # Create processing job record
        processing_job = ProcessingJob(
            id=job_id,
            pyannote_job_id="",  # Will be set after API call
            status="uploading",
            file_path=str(temp_file_path),
            webhook_url=webhook_url
        )
        active_jobs[job_id] = processing_job
        
        # Start diarization
        try:
            job_status = await pyannote_client.diarize_file(
                file_path=temp_file_path,
                webhook_url=webhook_url,
                wait_for_completion=wait_for_completion,
                model=model,
                num_speakers=num_speakers,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
                turn_level_confidence=turn_level_confidence,
                exclusive=exclusive,
                confidence=confidence
            )
            
            # Update job record
            processing_job.pyannote_job_id = job_status.jobId
            processing_job.status = job_status.status
            
            if wait_for_completion and job_status.output:
                processing_job.result = job_status.output
            
            return JobCreationResponse(
                jobId=job_id,
                status=job_status.status,
                message=f"Diarization {'completed' if wait_for_completion else 'started'} successfully"
            )
            
        except RateLimitExceeded as e:
            processing_job.status = "rate_limited"
            processing_job.error_message = f"Rate limit exceeded. Retry after {e.retry_after} seconds."
            
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "retry_after": e.retry_after,
                    "limit": e.limit,
                    "remaining": e.remaining
                }
            )
            
        except PyannoteAPIError as e:
            processing_job.status = "failed"
            processing_job.error_message = str(e)
            
            raise HTTPException(
                status_code=e.status_code or 500,
                detail=f"pyannote.ai API error: {e.message}"
            )
            
    except Exception as e:
        logger.error(f"Failed to process upload: {e}")
        
        # Update job status if it exists
        if job_id in active_jobs:
            active_jobs[job_id].status = "failed"
            active_jobs[job_id].error_message = str(e)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file: {str(e)}"
        )


@router.post("/url", response_model=JobCreationResponse)
async def diarize_from_url(
    request: DiarizationRequest,
    wait_for_completion: bool = False
):
    """
    Start diarization from audio URL.
    Based on: https://docs.pyannote.ai/tutorials/how-to-diarize-audio
    """
    if not request.url:
        raise HTTPException(
            status_code=400,
            detail="Audio URL is required"
        )
    
    job_id = str(uuid.uuid4())
    
    try:
        # Create processing job record
        processing_job = ProcessingJob(
            id=job_id,
            pyannote_job_id="",
            status="starting",
            file_url=request.url,
            webhook_url=request.webhook
        )
        active_jobs[job_id] = processing_job
        
        # Create diarization job
        job_response = await pyannote_client.create_diarization_job(
            audio_url=request.url,
            webhook_url=request.webhook,
            model=request.model,
            num_speakers=request.numSpeakers,
            min_speakers=request.minSpeakers,
            max_speakers=request.maxSpeakers,
            turn_level_confidence=request.turnLevelConfidence,
            exclusive=request.exclusive,
            confidence=request.confidence
        )
        
        # Update job record
        processing_job.pyannote_job_id = job_response.jobId
        processing_job.status = job_response.status
        
        if wait_for_completion:
            # Wait for completion
            job_status = await pyannote_client.wait_for_completion(job_response.jobId)
            processing_job.status = job_status.status
            
            if job_status.output:
                processing_job.result = job_status.output
        
        return JobCreationResponse(
            jobId=job_id,
            status=processing_job.status,
            message=f"Diarization {'completed' if wait_for_completion else 'started'} successfully"
        )
        
    except RateLimitExceeded as e:
        processing_job.status = "rate_limited"
        processing_job.error_message = f"Rate limit exceeded. Retry after {e.retry_after} seconds."
        
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": e.retry_after,
                "limit": e.limit,
                "remaining": e.remaining
            }
        )
        
    except PyannoteAPIError as e:
        processing_job.status = "failed"
        processing_job.error_message = str(e)
        
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"pyannote.ai API error: {e.message}"
        )
        
    except Exception as e:
        logger.error(f"Failed to start diarization: {e}")
        
        if job_id in active_jobs:
            active_jobs[job_id].status = "failed"
            active_jobs[job_id].error_message = str(e)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start diarization: {str(e)}"
        )


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """
    Get job status and results.
    Based on: https://docs.pyannote.ai/tutorials/how-to-poll-job-results
    """
    if job_id not in active_jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    processing_job = active_jobs[job_id]
    
    try:
        # If we have a pyannote job ID, check its status
        if processing_job.pyannote_job_id:
            pyannote_status = await pyannote_client.get_job_status(processing_job.pyannote_job_id)
            
            # Update local job status
            processing_job.status = pyannote_status.status
            if pyannote_status.output:
                processing_job.result = pyannote_status.output
            
            return JobStatus(
                jobId=job_id,
                status=pyannote_status.status,
                message=pyannote_status.message,
                output=pyannote_status.output,
                created_at=processing_job.created_at,
                completed_at=pyannote_status.completed_at
            )
        else:
            # Return local job status
            return JobStatus(
                jobId=job_id,
                status=processing_job.status,
                message=processing_job.error_message or "Job in progress",
                output=processing_job.result,
                created_at=processing_job.created_at
            )
            
    except PyannoteAPIError as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Failed to get job status: {e.message}"
        )


@router.get("/jobs", response_model=List[JobStatus])
async def list_jobs():
    """List all active jobs."""
    jobs = []
    
    for job_id, processing_job in active_jobs.items():
        jobs.append(JobStatus(
            jobId=job_id,
            status=processing_job.status,
            message=processing_job.error_message or "Job in progress",
            output=processing_job.result,
            created_at=processing_job.created_at
        ))
    
    return jobs


@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel and remove a job."""
    if job_id not in active_jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )
    
    processing_job = active_jobs[job_id]
    
    # Clean up temporary file if it exists
    if processing_job.file_path:
        try:
            Path(processing_job.file_path).unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Failed to delete temporary file: {e}")
    
    # Remove from active jobs
    del active_jobs[job_id]
    
    return {"message": f"Job {job_id} cancelled and removed"}
