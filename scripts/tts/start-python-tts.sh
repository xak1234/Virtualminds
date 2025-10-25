#!/bin/bash

echo "============================================"
echo "  Criminal Minds - Python TTS Server"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "ERROR: Python 3 is not installed!"
    echo ""
    echo "Please install Python 3.8+ from:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "  MacOS: brew install python3"
    echo ""
    exit 1
fi

echo "Python found: $(python3 --version)"
echo ""

# Create voices directory if it doesn't exist
if [ ! -d "voices" ]; then
    echo "Creating voices directory..."
    mkdir -p voices
    echo ""
fi

# Check if dependencies are installed
echo "Checking dependencies..."
python3 -c "import TTS" 2>/dev/null
if [ $? -ne 0 ]; then
    echo ""
    echo "Installing dependencies..."
    echo "This will take 5-10 minutes and download ~2GB of AI models"
    echo ""
    python3 -m pip install --upgrade pip
    python3 -m pip install -r scripts/requirements-tts.txt
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install dependencies!"
        echo "Try running manually:"
        echo "  python3 -m pip install -r scripts/requirements-tts.txt"
        echo ""
        exit 1
    fi
    echo ""
    echo "Dependencies installed successfully!"
    echo ""
fi

echo "============================================"
echo "  Starting TTS Server..."
echo "============================================"
echo ""
echo "Server URL: http://localhost:8000"
echo "API Docs:   http://localhost:8000/docs"
echo "Voices:     http://localhost:8000/voices"
echo ""
echo "Press CTRL+C to stop the server"
echo ""
echo "Add your voice samples (WAV files) to the 'voices' folder"
echo "Example: voices/tony_blair.wav, voices/trump.wav"
echo ""

# Start the server
python3 scripts/coqui-xtts-server.py

