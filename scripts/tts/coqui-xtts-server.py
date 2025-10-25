#!/usr/bin/env python3
"""
Coqui XTTS-v2 Self-Hosted TTS Server
====================================

This server provides voice cloning capabilities using Coqui XTTS-v2.

Installation:
    pip install TTS fastapi uvicorn python-multipart

Usage:
    python coqui-xtts-server.py

API Endpoints:
    POST /tts - Generate speech
    GET /health - Health check
    GET /voices - List available voices
    POST /clone - Clone a new voice from audio sample

For detailed setup instructions, see SELF-HOSTED-TTS-SETUP.md
"""

import os
import io
import json
import tempfile
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

try:
    from TTS.api import TTS
except ImportError:
    print("ERROR: TTS library not found. Please install it:")
    print("pip install TTS")
    exit(1)

# Configuration
VOICES_DIR = Path("./voces")
VOICES_DIR.mkdir(exist_ok=True)

# Initialize TTS model
print("Loading Coqui XTTS-v2 model...")
print("This may take a few minutes on first run...")
# Set environment variable to accept TOS automatically
os.environ["COQUI_TOS_AGREED"] = "1"
tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
print("Model loaded successfully!")

# FastAPI app
app = FastAPI(title="Coqui XTTS Server", version="1.0.0")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice: str
    language: str = "en"
    speed: float = 1.0

class TTSResponse(BaseModel):
    message: str
    voice: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": "xtts_v2"}

@app.get("/voices")
async def list_voices():
    """List all available cloned voices"""
    voices = []
    # Support WAV, MP3, and M4A files
    for ext in ["*.wav", "*.mp3", "*.m4a"]:
        for voice_file in VOICES_DIR.glob(ext):
            voices.append(voice_file.stem)  # Filename without extension
    
    # Remove duplicates and sort
    voices = sorted(set(voices))
    
    return {"voices": voices}

@app.post("/tts")
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using a cloned voice
    
    Args:
        text: Text to convert to speech
        voice: Name of the cloned voice (without .wav extension)
        language: Language code (default: en)
        speed: Speed multiplier (default: 1.0)
    
    Returns:
        Audio file as MP3
    """
    try:
        # Find the voice sample file
        voice_path = VOICES_DIR / f"{request.voice}.wav"
        
        if not voice_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Voice '{request.voice}' not found. Available voices: {[v.stem for v in VOICES_DIR.glob('*.wav')]}"
            )
        
        print(f"Generating speech for voice: {request.voice}")
        print(f"Text length: {len(request.text)} characters")
        
        # Generate speech using cross-platform temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            tts.tts_to_file(
                text=request.text,
                speaker_wav=str(voice_path),
                language=request.language,
                file_path=output_path,
                speed=request.speed
            )
            
            # Read the generated audio
            with open(output_path, "rb") as f:
                audio_data = f.read()
        finally:
            # Clean up temp file
            try:
                os.remove(output_path)
            except:
                pass
        
        print(f"Generated {len(audio_data)} bytes of audio")
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename={request.voice}.wav"
            }
        )
        
    except Exception as e:
        print(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clone")
async def clone_voice(
    name: str,
    audio: UploadFile = File(...)
):
    """
    Clone a voice from an audio sample
    
    Args:
        name: Name for the cloned voice (will be used in /tts requests)
        audio: Audio file (WAV format, 5-30 seconds, clear speech)
    
    Returns:
        Success message
    """
    try:
        # Validate audio format
        if not audio.filename.endswith(('.wav', '.mp3', '.m4a')):
            raise HTTPException(
                status_code=400,
                detail="Audio must be WAV, MP3, or M4A format"
            )
        
        # Save the voice sample
        voice_path = VOICES_DIR / f"{name}.wav"
        
        with open(voice_path, "wb") as f:
            content = await audio.read()
            f.write(content)
        
        return {
            "message": f"Voice '{name}' cloned successfully!",
            "path": str(voice_path),
            "size_bytes": len(content)
        }
        
    except Exception as e:
        print(f"Error cloning voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/voices/{voice_name}")
async def delete_voice(voice_name: str):
    """Delete a cloned voice"""
    voice_path = VOICES_DIR / f"{voice_name}.wav"
    
    if not voice_path.exists():
        raise HTTPException(status_code=404, detail=f"Voice '{voice_name}' not found")
    
    voice_path.unlink()
    return {"message": f"Voice '{voice_name}' deleted successfully"}

if __name__ == "__main__":
    import sys
    # Force UTF-8 encoding for console output
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except:
            pass
    
    print("\n" + "="*60)
    print("Coqui XTTS-v2 Self-Hosted TTS Server")
    print("="*60)
    print(f"\nVoices directory: {VOICES_DIR.absolute()}")
    print("\nStarting server on http://localhost:8000")
    print("\nAPI Documentation: http://localhost:8000/docs")
    print("\nPress CTRL+C to stop the server")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

