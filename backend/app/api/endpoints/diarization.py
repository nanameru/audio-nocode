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
from app.services.pyannote_client import pyannote_client
from app.services.local_pyannote import get_local_pyannote_service
from app.services.audio_converter import get_audio_converter

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
    """
    Upload audio/video file and start standard diarization with WebM support.
    """
    # Validate file type - support audio and video files (including webm)
    audio_extensions = {'.wav', '.mp3', '.mp4', '.m4a', '.flac', '.ogg', '.webm', '.aac', '.wma', '.avi', '.mov', '.mkv', '.flv'}
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    
    is_audio_content_type = file.content_type and (
        file.content_type.startswith("audio/") or 
        file.content_type.startswith("video/") or
        file.content_type == "application/octet-stream"
    )
    is_audio_extension = file_extension in audio_extensions
    
    if not (is_audio_content_type or is_audio_extension):
        raise HTTPException(
            status_code=400,
            detail=f"File must be an audio/video file. Received content-type: {file.content_type}, extension: {file_extension}"
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
        
        # Convert video to audio if needed
        converter = get_audio_converter()
        audio_file_path = temp_file_path
        converted_file_path = None
        
        if converter.needs_conversion(temp_file_path):
            logger.info(f"Converting video file to audio: {temp_file_path}")
            try:
                audio_file_path, was_converted = await converter.convert_to_audio(temp_file_path, upload_dir)
                if was_converted:
                    converted_file_path = audio_file_path
                    logger.info(f"Video converted to audio: {audio_file_path}")
            except Exception as conv_error:
                logger.error(f"Failed to convert video to audio: {conv_error}")
                # Clean up uploaded file
                if temp_file_path.exists():
                    temp_file_path.unlink()
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to extract audio from video file: {str(conv_error)}"
                )
        
        # Create processing job record
        processing_job = ProcessingJob(
            id=job_id,
            pyannote_job_id="",  # Will be set after API call
            status="uploading",
            file_path=str(audio_file_path),
            webhook_url=webhook_url
        )
        active_jobs[job_id] = processing_job
        
        # Start standard diarization
        try:
            diarization_params = {
                "model": model or "precision-2",
                "webhook_url": webhook_url,
                "wait_for_completion": wait_for_completion
            }
            
            if num_speakers is not None:
                diarization_params["num_speakers"] = num_speakers
            else:
                if min_speakers is not None:
                    diarization_params["min_speakers"] = min_speakers
                if max_speakers is not None:
                    diarization_params["max_speakers"] = max_speakers
            
            if turn_level_confidence:
                diarization_params["turn_level_confidence"] = turn_level_confidence
            if exclusive:
                diarization_params["exclusive"] = exclusive
            if confidence:
                diarization_params["confidence"] = confidence
            
            job_status = await pyannote_client.diarize_file(
                file_path=audio_file_path,
                **diarization_params
            )
            
            # Update job record
            processing_job.pyannote_job_id = job_status.job_id
            processing_job.status = job_status.status
            
            logger.info(f"Started diarization job: {job_status.job_id}")
            
            return JobCreationResponse(
                jobId=job_id,
                status=job_status.status,
                message=job_status.message or "Diarization job started successfully"
            )
            
        except Exception as e:
            logger.error(f"Failed to start diarization: {str(e)}")
            processing_job.status = "failed"
            
            # Clean up files
            if temp_file_path.exists():
                temp_file_path.unlink()
            if converted_file_path and converted_file_path.exists():
                converted_file_path.unlink()
                
            raise HTTPException(
                status_code=500,
                detail=f"Failed to start diarization: {str(e)}"
            )
            
    except Exception as e:
        logger.error(f"Failed to process upload: {str(e)}")
        
        # Clean up uploaded files if they exist
        if 'temp_file_path' in locals() and temp_file_path.exists():
            temp_file_path.unlink()
        if 'converted_file_path' in locals() and converted_file_path and converted_file_path.exists():
            converted_file_path.unlink()
            
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process upload: {str(e)}"
        )


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
    # Validate file type - support audio and video files (including webm)
    audio_extensions = {'.wav', '.mp3', '.mp4', '.m4a', '.flac', '.ogg', '.webm', '.aac', '.wma'}
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    
    is_audio_content_type = file.content_type and (
        file.content_type.startswith("audio/") or 
        file.content_type.startswith("video/") or
        file.content_type == "application/octet-stream"
    )
    is_audio_extension = file_extension in audio_extensions
    
    if not (is_audio_content_type or is_audio_extension):
        raise HTTPException(
            status_code=400,
            detail=f"File must be an audio/video file. Received content-type: {file.content_type}, extension: {file_extension}"
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
        
        # Convert video to audio if needed
        converter = get_audio_converter()
        audio_file_path = temp_file_path
        converted_file_path = None
        
        if converter.needs_conversion(temp_file_path):
            logger.info(f"Converting video file to audio for pyannote 3.1: {temp_file_path}")
            try:
                audio_file_path, was_converted = await converter.convert_to_audio(temp_file_path, upload_dir)
                if was_converted:
                    converted_file_path = audio_file_path
                    logger.info(f"Video converted to audio for pyannote 3.1: {audio_file_path}")
            except Exception as conv_error:
                logger.error(f"Failed to convert video to audio: {conv_error}")
                # Clean up uploaded file
                if temp_file_path.exists():
                    temp_file_path.unlink()
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to extract audio from video file: {str(conv_error)}"
                )
        
        # Create processing job record
        processing_job = ProcessingJob(
            id=job_id,
            pyannote_job_id="",  # Will be set after API call
            status="uploading",
            file_path=str(audio_file_path),
            webhook_url=webhook_url
        )
        active_jobs[job_id] = processing_job
        
        # Start local pyannote 3.1 diarization
        try:
            logger.info("🚀 Starting pyannote 3.1 local diarization...")
            
            # Get local pyannote service
            logger.info("🔄 Getting local pyannote service...")
            local_service = await get_local_pyannote_service()
            
            logger.info(f"🔍 Service availability check: {local_service.is_available()}")
            
            if not local_service.is_available():
                logger.error("❌ Local pyannote.audio service not available!")
                logger.error("💡 Possible causes:")
                logger.error("   1. Hugging Face token not set or invalid")
                logger.error("   2. pyannote.audio not installed")
                logger.error("   3. Model download failed")
                logger.error("   4. License not accepted for pyannote/speaker-diarization-3.1")
                
                raise HTTPException(
                    status_code=503,
                    detail="Local pyannote.audio service not available. Please check dependencies and Hugging Face token."
                )
            
            # Run local diarization
            logger.info(f"🎯 Running diarization on: {audio_file_path}")
            logger.info(f"   Parameters: speakers={num_speakers}, min={min_speakers}, max={max_speakers}")
            logger.info(f"   GPU: {use_gpu}, Progress: {progress_monitoring}, Memory optimized: {memory_optimized}")
            
            segments = await local_service.diarize_audio(
                audio_path=audio_file_path,
                num_speakers=num_speakers,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
                use_gpu=use_gpu,
                progress_monitoring=progress_monitoring,
                memory_optimized=memory_optimized
            )
            
            logger.info(f"✅ Diarization completed: {len(segments)} segments found")
            
            # Update job record with results
            processing_job.status = "completed"
            processing_job.result = {
                "diarization": segments,
                "num_speakers": len(set(s["speaker"] for s in segments)),
                "total_segments": len(segments),
                "duration": max(s["end"] for s in segments) if segments else 0.0
            }
            
            return JobCreationResponse(
                jobId=job_id,
                status="completed",
                message=f"Local pyannote 3.1 diarization completed successfully: {len(segments)} segments, {len(set(s['speaker'] for s in segments))} speakers"
            )
            
        except Exception as diarization_error:
            logger.error(f"❌ Local pyannote 3.1 diarization failed: {diarization_error}")
            logger.error(f"🔍 Error type: {type(diarization_error).__name__}")
            logger.error(f"🔍 Error details: {str(diarization_error)}")
            
            # Provide specific error guidance
            error_str = str(diarization_error).lower()
            if 'authentication' in error_str or 'token' in error_str or 'unauthorized' in error_str:
                logger.error("💡 Authentication Error - Check Hugging Face token")
            elif 'model' in error_str or 'pipeline' in error_str:
                logger.error("💡 Model Error - Check pyannote.audio installation and model access")
            elif 'memory' in error_str or 'cuda' in error_str:
                logger.error("💡 Resource Error - Check memory/GPU availability")
            elif 'file' in error_str or 'audio' in error_str:
                logger.error("💡 File Error - Check audio file format and accessibility")
            
            processing_job.status = "failed"
            processing_job.error_message = str(diarization_error)
            
            # Clean up files
            if temp_file_path.exists():
                temp_file_path.unlink()
                logger.info(f"🧹 Cleaned up temporary file: {temp_file_path}")
            if converted_file_path and converted_file_path.exists():
                converted_file_path.unlink()
                logger.info(f"🧹 Cleaned up converted file: {converted_file_path}")
            
            raise HTTPException(
                status_code=500,
                detail=f"Local pyannote 3.1 diarization failed: {str(diarization_error)}"
            )
            
    except Exception as e:
        logger.error(f"Failed to process pyannote 3.1 upload: {e}")
        
        # Update job status if it exists
        if job_id in active_jobs:
            active_jobs[job_id].status = "failed"
            active_jobs[job_id].error_message = str(e)
        
        # Clean up uploaded files if they exist
        if 'temp_file_path' in locals() and temp_file_path.exists():
            temp_file_path.unlink()
        if 'converted_file_path' in locals() and converted_file_path and converted_file_path.exists():
            converted_file_path.unlink()
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file with pyannote 3.1: {str(e)}"
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
