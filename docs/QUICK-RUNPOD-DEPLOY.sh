#!/bin/bash
# Quick RunPod TTS Server Setup Script
# Run this on your RunPod pod after connecting via terminal

set -e

echo "=================================================="
echo "  Criminal Minds - GPU TTS Server Setup"
echo "=================================================="
echo ""

# Create directory
echo "📁 Creating workspace..."
mkdir -p /workspace/tts-server
cd /workspace/tts-server

# Download files
echo "📥 Downloading server files..."
# For now, create the files directly since we don't have a public repo
cat > coqui-xtts-server.py << 'EOF'
#!/usr/bin/env python3
"""
Coqui XTTS-v2 Self-Hosted TTS Server (GPU Optimized)
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

# Initialize TTS model with GPU
print("Loading Coqui XTTS-v2 model on GPU...")
print("This may take a few minutes on first run...")
os.environ["COQUI_TOS_AGREED"] = "1"

# Check for GPU
import torch
gpu_available = torch.cuda.is_available()
print(f"GPU Available: {gpu_available}")
if gpu_available:
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False, gpu=gpu_available)
print("Model loaded successfully!")

# FastAPI app
app = FastAPI(title="Coqui XTTS-v2 Server", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class TTSRequest(BaseModel):
    text: str
    voice: str
    language: str = "en"
    speed: float = 1.0

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "xtts_v2", "gpu": gpu_available}

@app.get("/voices")
async def list_voices():
    voices = []
    for ext in ["*.wav", "*.mp3", "*.m4a"]:
        for voice_file in VOICES_DIR.glob(ext):
            voices.append(voice_file.stem)
    voices = sorted(set(voices))
    return {"voices": voices}

@app.post("/tts")
async def generate_speech(request: TTSRequest):
    try:
        voice_path = None
        for ext in ["wav", "mp3", "m4a"]:
            path = VOICES_DIR / f"{request.voice}.{ext}"
            if path.exists():
                voice_path = path
                break
        
        if not voice_path:
            raise HTTPException(
                status_code=404,
                detail=f"Voice '{request.voice}' not found. Available voices: {[v.stem for v in VOICES_DIR.glob('*.wav')]}"
            )
        
        print(f"Generating speech for voice: {request.voice}")
        print(f"Text length: {len(request.text)} characters")
        
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
            
            with open(output_path, "rb") as f:
                audio_data = f.read()
        finally:
            try:
                os.remove(output_path)
            except:
                pass
        
        print(f"Generated {len(audio_data)} bytes of audio")
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename={request.voice}.wav"
            }
        )
        
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Coqui XTTS-v2 Self-Hosted TTS Server (GPU)")
    print("="*60)
    print(f"\nGPU Enabled: {gpu_available}")
    print(f"Voices directory: {VOICES_DIR.absolute()}")
    print("\nStarting server on http://0.0.0.0:8000")
    print("\nAPI Documentation: http://0.0.0.0:8000/docs")
    print("Press CTRL+C to stop the server")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

cat > requirements-tts.txt << 'EOF'
# GPU TTS Server Requirements
TTS>=0.22.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
torch==2.5.1
torchaudio==2.5.1
transformers<4.37
tokenizers<0.19,>=0.14
networkx<3.0.0,>=2.5.0
EOF

echo "✅ Files created"
echo ""

# Install dependencies
echo "📦 Installing dependencies (this will take 5-10 minutes)..."
pip install --upgrade pip
pip install -r requirements-tts.txt

echo ""
echo "✅ Dependencies installed"
echo ""

# Create voices directory
mkdir -p voces

echo "=================================================="
echo "  ✅ Setup Complete!"
echo "=================================================="
echo ""
echo "📁 Upload your voice files to: /workspace/tts-server/voces/"
echo ""
echo "   Required files:"
echo "   - andrew.wav"
echo "   - jimmy.wav"
echo "   - katey.wav"
echo "   - shann.wav"
echo "   - tony.wav"
echo "   - yorkshire.wav"
echo ""
echo "🚀 To start the server:"
echo "   python coqui-xtts-server.py"
echo ""
echo "🌐 Your TTS URL will be:"
echo "   https://[YOUR-POD-ID]-8000.proxy.runpod.net"
echo ""
echo "=================================================="

