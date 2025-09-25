"""
Webhook endpoints for receiving pyannote.ai results.
Based on: https://docs.pyannote.ai/webhooks/receiving-webhooks
"""

import logging
import hmac
import hashlib
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models.pyannote_models import WebhookPayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook signature for security.
    Based on: https://docs.pyannote.ai/webhooks/verifying-webhooks
    """
    if not secret:
        logger.warning("Webhook secret not configured, skipping verification")
        return True
    
    try:
        # Create expected signature
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
        
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {e}")
        return False


@router.post("/pyannote")
async def receive_pyannote_webhook(
    request: Request,
    x_signature_256: str = Header(None, alias="X-Signature-256")
):
    """
    Receive webhook from pyannote.ai when job is completed.
    Based on: https://docs.pyannote.ai/webhooks/receiving-webhooks
    """
    try:
        # Get raw payload
        payload = await request.body()
        
        # Verify signature if secret is configured
        if settings.webhook_secret and x_signature_256:
            if not verify_webhook_signature(payload, x_signature_256, settings.webhook_secret):
                logger.warning("Invalid webhook signature")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid webhook signature"
                )
        
        # Parse JSON payload
        try:
            webhook_data = await request.json()
            webhook_payload = WebhookPayload(**webhook_data)
        except Exception as e:
            logger.error(f"Failed to parse webhook payload: {e}")
            raise HTTPException(
                status_code=400,
                detail="Invalid webhook payload"
            )
        
        logger.info(f"Received webhook for job {webhook_payload.jobId}: {webhook_payload.status}")
        
        # Find corresponding processing job
        from app.api.endpoints.diarization import active_jobs
        
        processing_job = None
        for job_id, job in active_jobs.items():
            if job.pyannote_job_id == webhook_payload.jobId:
                processing_job = job
                break
        
        if processing_job:
            # Update job status
            processing_job.status = webhook_payload.status
            
            if webhook_payload.output:
                processing_job.result = webhook_payload.output
                logger.info(f"Job {processing_job.id} completed with {len(webhook_payload.output.diarization)} segments")
            
            # Clean up temporary file if job is completed
            if webhook_payload.status in ["succeeded", "failed", "canceled"]:
                if processing_job.file_path:
                    try:
                        from pathlib import Path
                        Path(processing_job.file_path).unlink(missing_ok=True)
                        logger.info(f"Cleaned up temporary file: {processing_job.file_path}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up temporary file: {e}")
        else:
            logger.warning(f"No processing job found for pyannote job {webhook_payload.jobId}")
        
        # Log webhook details
        if webhook_payload.status == "succeeded" and webhook_payload.output:
            segments_count = len(webhook_payload.output.diarization)
            speakers = set(seg.speaker for seg in webhook_payload.output.diarization)
            logger.info(f"Diarization completed: {segments_count} segments, {len(speakers)} speakers")
        elif webhook_payload.status == "failed":
            logger.error(f"Diarization failed for job {webhook_payload.jobId}")
        
        return JSONResponse(
            content={"status": "received", "jobId": webhook_payload.jobId},
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Webhook processing failed"
        )


@router.get("/test")
async def test_webhook_endpoint():
    """Test webhook endpoint availability."""
    return {
        "status": "ok",
        "message": "Webhook endpoint is available",
        "webhook_url": f"{settings.webhook_base_url}/webhooks/pyannote"
    }
