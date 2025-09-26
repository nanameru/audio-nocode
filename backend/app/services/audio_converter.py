"""
Audio conversion service for handling video files (WebM, MP4, etc.)
Extracts audio from video files for processing with pyannote.audio using FFmpeg
"""

import logging
import subprocess
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class AudioConverter:
    """Service for converting video files to audio format using FFmpeg."""
    
    def __init__(self):
        self.supported_video_extensions = {'.webm', '.mp4', '.avi', '.mov', '.mkv', '.flv'}
        self.supported_audio_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac', '.wma'}
        self._ffmpeg_available = None
        
    def is_video_file(self, file_path: Path) -> bool:
        """Check if file is a video file based on extension."""
        return file_path.suffix.lower() in self.supported_video_extensions
        
    def is_audio_file(self, file_path: Path) -> bool:
        """Check if file is an audio file based on extension."""
        return file_path.suffix.lower() in self.supported_audio_extensions
        
    def needs_conversion(self, file_path: Path) -> bool:
        """Check if file needs conversion to audio format."""
        return self.is_video_file(file_path)
    
    def _is_ffmpeg_available(self) -> bool:
        """Check if FFmpeg is available on the system."""
        if self._ffmpeg_available is None:
            try:
                result = subprocess.run(
                    ['ffmpeg', '-version'], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                self._ffmpeg_available = result.returncode == 0
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                self._ffmpeg_available = False
        return self._ffmpeg_available
    
    async def _extract_audio_with_ffmpeg(
        self, 
        video_path: Path, 
        output_path: Path
    ) -> Path:
        """Extract audio using FFmpeg directly."""
        logger.info(f"Extracting audio using FFmpeg: {video_path} -> {output_path}")
        
        try:
            # Use FFmpeg to extract audio
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # PCM 16-bit little-endian
                '-ar', '16000',  # Sample rate 16kHz (good for speech)
                '-ac', '1',  # Mono channel
                '-y',  # Overwrite output file
                str(output_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg failed: {result.stderr}")
                
            if not output_path.exists():
                raise RuntimeError("FFmpeg completed but output file was not created")
                
            logger.info(f"FFmpeg audio extraction completed: {output_path}")
            return output_path
            
        except subprocess.TimeoutExpired:
            raise RuntimeError("FFmpeg extraction timed out after 5 minutes")
        except Exception as e:
            raise RuntimeError(f"FFmpeg extraction failed: {str(e)}")
        
    async def extract_audio_from_video(
        self, 
        video_path: Path, 
        output_path: Optional[Path] = None,
        audio_format: str = "wav"
    ) -> Path:
        """
        Extract audio from video file using FFmpeg.
        
        Args:
            video_path: Path to input video file
            output_path: Path for output audio file (optional)
            audio_format: Output audio format (wav, mp3, etc.)
            
        Returns:
            Path to extracted audio file
            
        Raises:
            RuntimeError: If FFmpeg is not available or conversion fails
            FileNotFoundError: If input video file does not exist
        """
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        # Check if FFmpeg is available
        if not self._is_ffmpeg_available():
            raise RuntimeError(
                "FFmpeg is required for video to audio conversion but is not available. "
                "Please install FFmpeg: https://ffmpeg.org/download.html"
            )
            
        # Generate output path if not provided
        if output_path is None:
            output_path = video_path.parent / f"{video_path.stem}_audio.{audio_format}"
            
        logger.info(f"Extracting audio from {video_path} to {output_path}")
        
        try:
            return await self._extract_audio_with_ffmpeg(video_path, output_path)
        except Exception as e:
            logger.error(f"Failed to extract audio from {video_path}: {e}")
            
            # Clean up partial output file
            if output_path and output_path.exists():
                try:
                    output_path.unlink()
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up partial file {output_path}: {cleanup_error}")
                    
            # Provide more specific error messages
            error_msg = str(e)
            if "No such file or directory" in error_msg:
                raise RuntimeError(f"Video file could not be processed: {video_path}")
            elif "Invalid data found" in error_msg:
                raise RuntimeError(f"Video file appears to be corrupted or in an unsupported format: {video_path}")
            elif "No audio stream" in error_msg:
                raise RuntimeError(f"Video file contains no audio track: {video_path}")
            else:
                raise RuntimeError(f"Audio extraction failed: {error_msg}")
            
    async def convert_to_audio(
        self, 
        input_path: Path, 
        output_dir: Optional[Path] = None
    ) -> Tuple[Path, bool]:
        """
        Convert input file to audio format if needed.
        
        Args:
            input_path: Path to input file (audio or video)
            output_dir: Directory for output file (optional)
            
        Returns:
            Tuple of (output_path, was_converted)
            - output_path: Path to audio file
            - was_converted: True if conversion was performed, False if file was already audio
            
        Raises:
            RuntimeError: If conversion fails
            FileNotFoundError: If input file does not exist
        """
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
            
        # If it's already an audio file, return as-is
        if self.is_audio_file(input_path):
            logger.info(f"File is already audio format: {input_path}")
            return input_path, False
            
        # If it's a video file, extract audio
        if self.is_video_file(input_path):
            output_dir = output_dir or input_path.parent
            output_path = output_dir / f"{input_path.stem}_extracted.wav"
            
            try:
                converted_path = await self.extract_audio_from_video(input_path, output_path)
                return converted_path, True
            except Exception as e:
                # Re-raise with more context
                raise RuntimeError(f"Failed to convert video file to audio: {str(e)}")
            
        # Unsupported file type
        supported_formats = list(self.supported_audio_extensions) + list(self.supported_video_extensions)
        raise RuntimeError(
            f"Unsupported file format '{input_path.suffix}'. "
            f"Supported formats: {', '.join(sorted(supported_formats))}"
        )
        
    def get_file_info(self, file_path: Path) -> dict:
        """Get information about the file."""
        return {
            "path": str(file_path),
            "name": file_path.name,
            "suffix": file_path.suffix.lower(),
            "is_audio": self.is_audio_file(file_path),
            "is_video": self.is_video_file(file_path),
            "needs_conversion": self.needs_conversion(file_path),
            "exists": file_path.exists()
        }


# Global converter instance
audio_converter = AudioConverter()


def get_audio_converter() -> AudioConverter:
    """Get the global audio converter instance."""
    return audio_converter
