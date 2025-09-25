"""
Pydantic models for pyannote.ai API integration.
Based on pyannote.ai API documentation: https://docs.pyannote.ai/
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# Request Models
class DiarizationRequest(BaseModel):
    """Request model for diarization job creation."""
    
    url: Optional[str] = Field(
        None,
        description="Public URL of the audio file to process"
    )
    webhook: Optional[str] = Field(
        None,
        description="Webhook URL to receive results"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com/audio.wav",
                "webhook": "https://example.com/webhook"
            }
        }


class FileUploadRequest(BaseModel):
    """Request model for file upload to temporary storage."""
    
    url: str = Field(
        ...,
        description="Temporary storage location (media://path/file.ext)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "media://example/conversation.wav"
            }
        }


# Response Models
class SpeakerSegment(BaseModel):
    """Individual speaker segment in diarization result."""
    
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    speaker: str = Field(..., description="Speaker label (e.g., SPEAKER_01)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "start": 1.2,
                "end": 3.4,
                "speaker": "SPEAKER_01"
            }
        }


class DiarizationOutput(BaseModel):
    """Diarization job output."""
    
    diarization: List[SpeakerSegment] = Field(
        ...,
        description="List of speaker segments"
    )


class JobStatus(BaseModel):
    """Job status response from pyannote.ai API."""
    
    jobId: str = Field(..., description="Unique job identifier")
    status: Literal["pending", "running", "succeeded", "failed", "canceled"] = Field(
        ...,
        description="Current job status"
    )
    message: Optional[str] = Field(None, description="Status message")
    output: Optional[DiarizationOutput] = Field(
        None,
        description="Job output (only available when status is 'succeeded')"
    )
    created_at: Optional[datetime] = Field(None, description="Job creation time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "jobId": "bd7e97c9-0742-4a19-bd5a-9df519ce8c74",
                "status": "succeeded",
                "message": "Job completed successfully",
                "output": {
                    "diarization": [
                        {
                            "start": 1.2,
                            "end": 3.4,
                            "speaker": "SPEAKER_01"
                        }
                    ]
                }
            }
        }


class JobCreationResponse(BaseModel):
    """Response when creating a new diarization job."""
    
    jobId: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Initial job status")
    message: str = Field(..., description="Creation message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "jobId": "bd7e97c9-0742-4a19-bd5a-9df519ce8c74",
                "message": "Job added to queue",
                "status": "pending"
            }
        }


class PresignedUrlResponse(BaseModel):
    """Response for presigned URL creation."""
    
    url: str = Field(..., description="Presigned URL for file upload")
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://s3.amazonaws.com/bucket/path?signature=..."
            }
        }


class WebhookPayload(BaseModel):
    """Webhook payload received from pyannote.ai."""
    
    jobId: str = Field(..., description="Job identifier")
    status: str = Field(..., description="Job status")
    output: Optional[DiarizationOutput] = Field(
        None,
        description="Job output (only when status is 'succeeded')"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "jobId": "bd7e97c9-0742-4a19-bd5a-9df519ce8c74",
                "status": "succeeded",
                "output": {
                    "diarization": [
                        {
                            "start": 1.2,
                            "end": 3.4,
                            "speaker": "SPEAKER_01"
                        }
                    ]
                }
            }
        }


# Error Models
class PyannoteError(BaseModel):
    """Error response from pyannote.ai API."""
    
    error: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class RateLimitError(BaseModel):
    """Rate limit error response."""
    
    error: str = Field(default="Rate limit exceeded")
    retry_after: int = Field(..., description="Seconds to wait before retry")
    limit: int = Field(..., description="Rate limit (requests per minute)")
    remaining: int = Field(..., description="Remaining requests in window")
    reset: int = Field(..., description="Rate limit reset time (UTC epoch)")


# Internal Models
class ProcessingJob(BaseModel):
    """Internal job tracking model."""
    
    id: str = Field(..., description="Internal job ID")
    pyannote_job_id: str = Field(..., description="pyannote.ai job ID")
    status: str = Field(..., description="Job status")
    file_path: Optional[str] = Field(None, description="Local file path")
    file_url: Optional[str] = Field(None, description="Remote file URL")
    webhook_url: Optional[str] = Field(None, description="Webhook URL")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    result: Optional[DiarizationOutput] = Field(None, description="Processing result")
    error_message: Optional[str] = Field(None, description="Error message if failed")
