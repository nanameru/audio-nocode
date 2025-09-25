"""
pyannote.ai API client implementation.
Based on official documentation: https://docs.pyannote.ai/
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from pathlib import Path

import httpx
from app.core.config import settings
from app.models.pyannote_models import (
    DiarizationRequest,
    JobCreationResponse,
    JobStatus,
    PresignedUrlResponse,
    FileUploadRequest,
    PyannoteError,
    RateLimitError
)

logger = logging.getLogger(__name__)


class PyannoteAPIError(Exception):
    """Custom exception for pyannote.ai API errors."""
    
    def __init__(self, message: str, status_code: int = None, details: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class RateLimitExceeded(PyannoteAPIError):
    """Exception raised when rate limit is exceeded."""
    
    def __init__(self, retry_after: int, limit: int, remaining: int, reset: int):
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining
        self.reset = reset
        super().__init__(
            f"Rate limit exceeded. Retry after {retry_after} seconds.",
            status_code=429
        )


class PyannoteClient:
    """
    Async client for pyannote.ai API.
    
    Implements all API endpoints as documented at:
    - https://docs.pyannote.ai/tutorials/how-to-diarize-audio
    - https://docs.pyannote.ai/tutorials/how-to-poll-job-results
    - https://docs.pyannote.ai/tutorials/how-to-upload-files
    """
    
    def __init__(self, api_key: str = None, base_url: str = None):
        """Initialize the pyannote.ai API client."""
        self.api_key = api_key or settings.pyannote_api_key
        self.base_url = base_url or settings.pyannote_base_url
        
        if not self.api_key:
            raise ValueError("pyannote.ai API key is required")
        
        # HTTP client with authentication headers
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Create async HTTP client
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=httpx.Timeout(30.0)  # 30 second timeout
        )
        
        logger.info(f"Initialized pyannote.ai client with base URL: {self.base_url}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """Handle HTTP response and raise appropriate exceptions."""
        
        # Handle rate limiting (429 Too Many Requests)
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            limit = int(response.headers.get("X-RateLimit-Limit", 100))
            remaining = int(response.headers.get("X-RateLimit-Remaining", 0))
            reset = int(response.headers.get("X-RateLimit-Reset", 0))
            
            raise RateLimitExceeded(
                retry_after=retry_after,
                limit=limit,
                remaining=remaining,
                reset=reset
            )
        
        # Handle other HTTP errors
        if not response.is_success:
            try:
                error_data = response.json()
                error_message = error_data.get("error", f"HTTP {response.status_code}")
            except:
                error_message = f"HTTP {response.status_code}: {response.text}"
            
            raise PyannoteAPIError(
                message=error_message,
                status_code=response.status_code,
                details={"response": response.text}
            )
        
        return response.json()
    
    async def test_api_key(self) -> bool:
        """
        Test API key validity.
        Based on: https://docs.pyannote.ai/api-reference/test
        """
        try:
            response = await self.client.get("/test")
            self._handle_response(response)
            logger.info("API key test successful")
            return True
        except Exception as e:
            logger.error(f"API key test failed: {e}")
            return False
    
    async def create_diarization_job(
        self,
        audio_url: str,
        webhook_url: Optional[str] = None,
        model: str = "precision-2",
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
        turn_level_confidence: bool = False,
        exclusive: bool = False,
        confidence: bool = False
    ) -> JobCreationResponse:
        """
        Create a diarization job.
        Based on: https://docs.pyannote.ai/api-reference/diarize
        
        Args:
            audio_url: Public URL of the audio file
            webhook_url: Optional webhook URL for results
            model: Model to use (precision-1 or precision-2)
            num_speakers: Number of speakers (if known)
            min_speakers: Minimum number of speakers
            max_speakers: Maximum number of speakers
            turn_level_confidence: Include turn-level confidence
            exclusive: Include exclusive diarization
            confidence: Include confidence scores
            
        Returns:
            JobCreationResponse with job ID and status
        """
        request_data = DiarizationRequest(
            url=audio_url,
            webhook=webhook_url,
            model=model,
            numSpeakers=num_speakers,
            minSpeakers=min_speakers,
            maxSpeakers=max_speakers,
            turnLevelConfidence=turn_level_confidence,
            exclusive=exclusive,
            confidence=confidence
        )
        
        logger.info(f"Creating diarization job for URL: {audio_url}")
        
        try:
            response = await self.client.post(
                "/diarize",
                json=request_data.model_dump(exclude_none=True)
            )
            
            data = self._handle_response(response)
            result = JobCreationResponse(**data)
            
            logger.info(f"Created diarization job: {result.jobId}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create diarization job: {e}")
            raise
    
    async def get_job_status(self, job_id: str) -> JobStatus:
        """
        Get job status and results.
        Based on: https://docs.pyannote.ai/tutorials/how-to-poll-job-results
        
        Args:
            job_id: Job identifier
            
        Returns:
            JobStatus with current status and results (if completed)
        """
        logger.debug(f"Getting status for job: {job_id}")
        
        try:
            response = await self.client.get(f"/jobs/{job_id}")
            data = self._handle_response(response)
            
            return JobStatus(**data)
            
        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {e}")
            raise
    
    async def wait_for_completion(
        self,
        job_id: str,
        poll_interval: int = 10,
        max_wait_time: int = 600
    ) -> JobStatus:
        """
        Wait for job completion by polling.
        Based on: https://docs.pyannote.ai/tutorials/how-to-poll-job-results
        
        Args:
            job_id: Job identifier
            poll_interval: Polling interval in seconds (default: 10)
            max_wait_time: Maximum wait time in seconds (default: 600)
            
        Returns:
            JobStatus when job is completed
        """
        logger.info(f"Waiting for job completion: {job_id}")
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            try:
                status = await self.get_job_status(job_id)
                
                # Check if job is completed
                if status.status in ["succeeded", "failed", "canceled"]:
                    logger.info(f"Job {job_id} completed with status: {status.status}")
                    return status
                
                # Check timeout
                elapsed_time = asyncio.get_event_loop().time() - start_time
                if elapsed_time > max_wait_time:
                    raise PyannoteAPIError(
                        f"Job {job_id} did not complete within {max_wait_time} seconds"
                    )
                
                # Wait before next poll
                logger.debug(f"Job {job_id} status: {status.status}, waiting {poll_interval}s...")
                await asyncio.sleep(poll_interval)
                
            except RateLimitExceeded as e:
                logger.warning(f"Rate limit exceeded, waiting {e.retry_after}s...")
                await asyncio.sleep(e.retry_after)
            except Exception as e:
                logger.error(f"Error while waiting for job completion: {e}")
                raise
    
    async def create_presigned_url(self, media_path: str) -> PresignedUrlResponse:
        """
        Create a presigned URL for file upload.
        Based on: https://docs.pyannote.ai/tutorials/how-to-upload-files
        
        Args:
            media_path: Media path (e.g., "media://example/file.wav")
            
        Returns:
            PresignedUrlResponse with upload URL
        """
        request_data = FileUploadRequest(url=media_path)
        
        logger.info(f"Creating presigned URL for: {media_path}")
        
        try:
            response = await self.client.post(
                "/media",
                json=request_data.model_dump()
            )
            
            data = self._handle_response(response)
            result = PresignedUrlResponse(**data)
            
            logger.info(f"Created presigned URL for: {media_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create presigned URL: {e}")
            raise
    
    async def upload_file(
        self,
        file_path: Path,
        media_path: str
    ) -> str:
        """
        Upload a file to temporary storage.
        Based on: https://docs.pyannote.ai/tutorials/how-to-upload-files
        
        Args:
            file_path: Local file path
            media_path: Remote media path (e.g., "media://example/file.wav")
            
        Returns:
            Media path for use in diarization jobs
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        logger.info(f"Uploading file {file_path} to {media_path}")
        
        try:
            # Get presigned URL
            presigned_response = await self.create_presigned_url(media_path)
            
            # Upload file using presigned URL
            with open(file_path, "rb") as file_data:
                upload_response = await self.client.put(
                    presigned_response.url,
                    content=file_data.read(),
                    headers={"Content-Type": "application/octet-stream"}
                )
            
            if not upload_response.is_success:
                raise PyannoteAPIError(
                    f"File upload failed: HTTP {upload_response.status_code}",
                    status_code=upload_response.status_code
                )
            
            logger.info(f"Successfully uploaded file to: {media_path}")
            return media_path
            
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    async def diarize_file(
        self,
        file_path: Path,
        webhook_url: Optional[str] = None,
        wait_for_completion: bool = True,
        model: str = "precision-2",
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
        turn_level_confidence: bool = False,
        exclusive: bool = False,
        confidence: bool = False,
        # pyannote 3.1 specific parameters
        use_gpu: bool = True,
        progress_monitoring: bool = True,
        memory_optimized: bool = False,
        enhanced_features: bool = False
    ) -> JobStatus:
        """
        Complete workflow: upload file and create diarization job.
        
        Args:
            file_path: Local audio file path
            webhook_url: Optional webhook URL
            wait_for_completion: Whether to wait for job completion
            model: Model to use (precision-1 or precision-2)
            num_speakers: Number of speakers (if known)
            min_speakers: Minimum number of speakers
            max_speakers: Maximum number of speakers
            turn_level_confidence: Include turn-level confidence
            exclusive: Include exclusive diarization
            confidence: Include confidence scores
            
        Returns:
            JobStatus with results (if wait_for_completion=True)
        """
        # Generate unique media path
        import uuid
        file_extension = file_path.suffix
        media_path = f"media://audio-studio/{uuid.uuid4()}{file_extension}"
        
        try:
            # Upload file
            uploaded_path = await self.upload_file(file_path, media_path)
            
            # Create diarization job
            job_response = await self.create_diarization_job(
                audio_url=uploaded_path,
                webhook_url=webhook_url,
                model=model,
                num_speakers=num_speakers,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
                turn_level_confidence=turn_level_confidence,
                exclusive=exclusive,
                confidence=confidence
            )
            
            if wait_for_completion:
                # Wait for completion and return results
                return await self.wait_for_completion(job_response.jobId)
            else:
                # Return job creation response as JobStatus
                return JobStatus(
                    jobId=job_response.jobId,
                    status=job_response.status,
                    message=job_response.message
                )
                
        except Exception as e:
            logger.error(f"Failed to diarize file {file_path}: {e}")
            raise


# Singleton instance for dependency injection
pyannote_client = PyannoteClient()
