"""
Local pyannote.audio 3.1 speaker diarization service.
Uses pyannote/speaker-diarization-3.1 model locally.
"""

import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import asyncio
from concurrent.futures import ThreadPoolExecutor

try:
    import torch
    import torchaudio
    from pyannote.audio import Pipeline
    from pyannote.audio.pipelines.utils.hook import ProgressHook
    PYANNOTE_AVAILABLE = True
except ImportError as e:
    PYANNOTE_AVAILABLE = False
    IMPORT_ERROR = str(e)

from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalPyannoteService:
    """Local pyannote.audio 3.1 service for speaker diarization."""
    
    def __init__(self):
        self.pipeline = None
        self.device = None
        self.executor = ThreadPoolExecutor(max_workers=1)  # Single worker for GPU usage
        
    async def initialize(self) -> bool:
        """Initialize the pyannote.audio pipeline."""
        logger.info("🔄 Initializing pyannote.audio 3.1 service...")
        
        if not PYANNOTE_AVAILABLE:
            logger.error(f"❌ pyannote.audio not available: {IMPORT_ERROR}")
            logger.error("💡 Install with: pip install pyannote.audio torch torchaudio")
            return False
            
        try:
            # Check for Hugging Face token
            hf_token = getattr(settings, 'hf_token', None) or getattr(settings, 'pyannote_api_key', None)
            logger.info(f"🔍 Checking Hugging Face token...")
            logger.info(f"   - HF_TOKEN exists: {bool(getattr(settings, 'hf_token', None))}")
            logger.info(f"   - PYANNOTE_API_KEY exists: {bool(getattr(settings, 'pyannote_api_key', None))}")
            
            if not hf_token:
                logger.error("❌ Hugging Face token not found!")
                logger.error("💡 Set HF_TOKEN or PYANNOTE_API_KEY in environment variables:")
                logger.error("   export HF_TOKEN=hf_your_token_here")
                logger.error("   or create .env.local file with: HF_TOKEN=hf_your_token_here")
                return False
            
            # Validate token format
            if not hf_token.startswith('hf_'):
                logger.warning(f"⚠️  Token format warning: Expected 'hf_' prefix, got: {hf_token[:10]}...")
            
            logger.info(f"✅ Found Hugging Face token: {hf_token[:10]}...")
            logger.info("📥 Loading pyannote/speaker-diarization-3.1 pipeline...")
            logger.info("   This may take several minutes on first run (downloading models)...")
            
            # Load pipeline in thread to avoid blocking
            loop = asyncio.get_event_loop()
            self.pipeline = await loop.run_in_executor(
                self.executor,
                self._load_pipeline,
                hf_token
            )
            
            # Set default device preference
            if torch.cuda.is_available():
                self.device = torch.device("cuda")
                logger.info("🚀 CUDA available, GPU will be used when requested")
            else:
                self.device = torch.device("cpu")
                logger.info("🐌 CUDA not available, CPU will be used")
                
            logger.info("✅ pyannote/speaker-diarization-3.1 pipeline loaded successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize pyannote pipeline: {e}")
            logger.error(f"🔍 Error type: {type(e).__name__}")
            
            # Provide specific error guidance
            error_str = str(e).lower()
            if 'authentication' in error_str or 'token' in error_str or 'unauthorized' in error_str:
                logger.error("💡 Authentication Error Solutions:")
                logger.error("   1. Check if your Hugging Face token is valid")
                logger.error("   2. Visit: https://huggingface.co/settings/tokens")
                logger.error("   3. Ensure token has 'read' permission")
                logger.error("   4. Accept pyannote/speaker-diarization-3.1 license")
            elif 'connection' in error_str or 'network' in error_str:
                logger.error("💡 Network Error Solutions:")
                logger.error("   1. Check internet connection")
                logger.error("   2. Check firewall/proxy settings")
                logger.error("   3. Try again later")
            elif 'memory' in error_str or 'cuda' in error_str:
                logger.error("💡 Memory/CUDA Error Solutions:")
                logger.error("   1. Try with CPU instead of GPU")
                logger.error("   2. Close other applications to free memory")
                logger.error("   3. Restart the service")
            
            return False
    
    def _load_pipeline(self, hf_token: str):
        """Load pipeline in thread (blocking operation)."""
        try:
            logger.info("🔄 Downloading pyannote/speaker-diarization-3.1 model...")
            logger.info(f"   Using token: {hf_token[:10]}...")
            
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            
            logger.info("✅ Model downloaded and loaded successfully!")
            return pipeline
            
        except Exception as e:
            logger.error(f"❌ Pipeline loading failed: {e}")
            logger.error(f"🔍 Error details: {type(e).__name__}: {str(e)}")
            raise
    
    async def diarize_audio(
        self,
        audio_path: Path,
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
        use_gpu: bool = True,
        progress_monitoring: bool = True,
        memory_optimized: bool = False,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Perform speaker diarization on audio file.
        
        Args:
            audio_path: Path to audio file
            num_speakers: Exact number of speakers (if known)
            min_speakers: Minimum number of speakers
            max_speakers: Maximum number of speakers
            use_gpu: Whether to use GPU if available
            progress_monitoring: Whether to monitor progress
            memory_optimized: Whether to use memory-optimized processing
            **kwargs: Additional parameters
            
        Returns:
            List of diarization segments with speaker labels and timestamps
        """
        if not self.pipeline:
            raise RuntimeError("Pipeline not initialized. Call initialize() first.")
            
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
        try:
            # Set torch device based on use_gpu parameter
            if use_gpu and torch.cuda.is_available():
                device = torch.device("cuda")
                torch.cuda.set_device(0)  # Use first GPU
                os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # Ensure GPU visibility
                logger.info(f"🚀 Using GPU device: {device}")
            else:
                device = torch.device("cpu")
                # Don't hide CUDA devices completely, just use CPU
                logger.info(f"🐌 Using CPU device: {device}")
            
            # pyannote.audio Pipeline handles device management internally
            # No need to manually move pipeline to device
            
            # Prepare diarization parameters
            diar_params = {}
            if num_speakers is not None:
                diar_params["num_speakers"] = num_speakers
            else:
                if min_speakers is not None:
                    diar_params["min_speakers"] = min_speakers
                if max_speakers is not None:
                    diar_params["max_speakers"] = max_speakers
            
            logger.info(f"Starting diarization with parameters: {diar_params}")
            logger.info(f"Using device: {device}")
            
            # Run diarization in thread
            if memory_optimized:
                # Process from memory for better performance
                diarization = await self._diarize_from_memory(
                    audio_path, diar_params, progress_monitoring
                )
            else:
                # Process directly from file
                diarization = await self._diarize_from_file(
                    audio_path, diar_params, progress_monitoring
                )
            
            # Convert to standard format
            segments = self._convert_to_segments(diarization)
            
            logger.info(f"Diarization completed: {len(segments)} segments, "
                       f"{len(set(s['speaker'] for s in segments))} unique speakers")
            
            return segments
            
        except Exception as e:
            logger.error(f"Diarization failed: {e}")
            raise
    
    async def _diarize_from_file(
        self, 
        audio_path: Path, 
        diar_params: Dict[str, Any],
        progress_monitoring: bool
    ):
        """Run diarization directly from file."""
        loop = asyncio.get_event_loop()
        
        if progress_monitoring:
            # Use progress hook
            def run_with_progress():
                with ProgressHook() as hook:
                    return self.pipeline(str(audio_path), hook=hook, **diar_params)
            
            return await loop.run_in_executor(self.executor, run_with_progress)
        else:
            # Run without progress monitoring
            return await loop.run_in_executor(
                self.executor,
                lambda: self.pipeline(str(audio_path), **diar_params)
            )
    
    async def _diarize_from_memory(
        self, 
        audio_path: Path, 
        diar_params: Dict[str, Any],
        progress_monitoring: bool
    ):
        """Run diarization from memory (pre-loaded audio)."""
        loop = asyncio.get_event_loop()
        
        # Load audio in thread
        waveform, sample_rate = await loop.run_in_executor(
            self.executor,
            lambda: torchaudio.load(str(audio_path))
        )
        
        # Prepare audio dict
        audio_dict = {"waveform": waveform, "sample_rate": sample_rate}
        
        if progress_monitoring:
            # Use progress hook
            def run_with_progress():
                with ProgressHook() as hook:
                    return self.pipeline(audio_dict, hook=hook, **diar_params)
            
            return await loop.run_in_executor(self.executor, run_with_progress)
        else:
            # Run without progress monitoring
            return await loop.run_in_executor(
                self.executor,
                lambda: self.pipeline(audio_dict, **diar_params)
            )
    
    def _convert_to_segments(self, diarization) -> List[Dict[str, Any]]:
        """Convert pyannote diarization to standard segment format."""
        segments = []
        
        for segment, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": float(segment.start),
                "end": float(segment.end),
                "speaker": str(speaker),
                "confidence": 1.0,  # pyannote doesn't provide confidence scores
                "duration": float(segment.end - segment.start)
            })
        
        # Sort by start time
        segments.sort(key=lambda x: x["start"])
        
        return segments
    
    def is_available(self) -> bool:
        """Check if the service is available and initialized."""
        return PYANNOTE_AVAILABLE and self.pipeline is not None
    
    async def cleanup(self):
        """Cleanup resources."""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)
        self.pipeline = None


# Global service instance
local_pyannote_service = LocalPyannoteService()


async def get_local_pyannote_service() -> LocalPyannoteService:
    """Get the local pyannote service instance."""
    if not local_pyannote_service.is_available():
        await local_pyannote_service.initialize()
    return local_pyannote_service
