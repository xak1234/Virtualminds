# Python TTS Server - Standalone Setup Guide
## Run the Voice Cloning Server Directly with Python

---

## 📋 **Prerequisites**

You need:
1. **Python 3.8 or higher** installed
2. **10 GB free disk space** (for AI models)
3. **4 GB RAM minimum** (8 GB recommended)

---

## 🔧 **Step 1: Install Python**

### **Windows**

1. Download Python from: https://www.python.org/downloads/
2. Run the installer
3. ⚠️ **IMPORTANT:** Check **"Add Python to PATH"** during installation!
4. Click "Install Now"

### **Verify Installation**

Open Command Prompt and run:
```bash
python --version
```

You should see something like: `Python 3.11.0`

---

## 🚀 **Step 2: Run the Setup Script**

### **Windows**

Double-click: `start-python-tts.bat`

Or from Command Prompt:
```bash
start-python-tts.bat
```

### **Linux/Mac**

```bash
chmod +x start-python-tts.sh
./start-python-tts.sh
```

---

## 📦 **What the Script Does**

1. ✅ Checks Python installation
2. ✅ Installs required packages (TTS, FastAPI, etc.)
3. ✅ Downloads AI models (~2GB, first run only)
4. ✅ Creates `voices` folder for your voice samples
5. ✅ Starts the TTS server on http://localhost:8000

---

## ⏱️ **First Run Timeline**

| Step | Time | Description |
|------|------|-------------|
| Install packages | 2-3 min | Downloads Python libraries |
| Download AI model | 5-10 min | ~2GB Coqui XTTS-v2 model |
| Start server | 30 sec | Loads model into memory |

**Total first run:** 8-14 minutes  
**Subsequent runs:** 30 seconds

---

## 🎭 **Step 3: Clone Voices**

### **Add Voice Samples to `voices` Folder**

1. Get audio samples (10-30 seconds, WAV format)
2. Copy to `voices` folder:
   ```
   voices/
     ├── tony_blair.wav
     ├── trump.wav
     ├── huntley.wav
     └── jimmy_savile.wav
   ```
3. Restart the server

**OR**

### **Upload via Web Interface**

1. Open: http://localhost:8000/docs
2. Click **POST /clone**
3. Click **"Try it out"**
4. Fill in:
   - `name`: `tony_blair`
   - `audio`: Upload WAV file
5. Click **Execute**

---

## 🔌 **Step 4: Configure Your App**

1. Open Criminal Minds Framework
2. Go to **Settings** → **Text-to-Speech**
3. Select **"Self-Hosted (Voice Cloning - FREE!)"**
4. API URL: `http://localhost:8000`
5. Click **Save**

---

## 🎯 **Test It**

1. Load a personality (e.g., Tony Blair)
2. Chat with them
3. Voice should play using your cloned voice!

---

## 🛠️ **Manual Installation (Alternative)**

If the script doesn't work, install manually:

```bash
# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r scripts/requirements-tts.txt

# Start server
python scripts/coqui-xtts-server.py
```

---

## 🐛 **Troubleshooting**

### **"Python is not recognized"**

Python not in PATH. Reinstall Python with "Add Python to PATH" checked.

### **"pip is not recognized"**

```bash
python -m ensurepip --upgrade
```

### **"No module named 'TTS'"**

```bash
python -m pip install TTS
```

### **"Failed to load model"**

- Check internet connection (model downloads from Coqui)
- Free up disk space (needs 10 GB)
- Try manually:
  ```bash
  python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
  ```

### **"Address already in use"**

Port 8000 is busy. Stop other servers or change port:
```python
# Edit scripts/coqui-xtts-server.py, line 207:
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use 8001 instead
```

### **Slow generation (60+ seconds per sentence)**

Running on CPU (normal). For GPU speed:
1. Install NVIDIA CUDA Toolkit
2. Install PyTorch with CUDA:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

---

## 🖥️ **System Requirements**

### **Minimum (CPU Only)**

- Python 3.8+
- 4 GB RAM
- 10 GB disk space
- **Speed:** 20-60 seconds per sentence

### **Recommended (GPU)**

- Python 3.8+
- NVIDIA GPU (4GB+ VRAM)
- 8 GB RAM
- 15 GB disk space
- CUDA 11.8+
- **Speed:** 1-5 seconds per sentence

---

## 📚 **API Endpoints**

Once running, visit http://localhost:8000/docs for full API documentation.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check server status |
| `/voices` | GET | List available voices |
| `/tts` | POST | Generate speech |
| `/clone` | POST | Clone a new voice |
| `/voices/{name}` | DELETE | Delete a voice |

---

## 💡 **Tips**

1. **Voice samples:** 10-30 seconds, clear speech, minimal background noise
2. **Keep server running:** Don't close the terminal window
3. **Multiple voices:** Just add more WAV files to `voices` folder
4. **Restart:** Press CTRL+C, then run the script again

---

## ✅ **Success!**

You should see:

```
🎤 Coqui XTTS-v2 Self-Hosted TTS Server
====================================
Starting server on http://localhost:8000
Press CTRL+C to stop the server
```

**Now start chatting with your AI personalities using your own cloned voices!** 🎉

---

## 🆘 **Still Having Issues?**

Check the full documentation:
- `SELF-HOSTED-TTS-SETUP.md` - Detailed setup guide
- `SELF-HOSTED-TTS-QUICKSTART.md` - Quick start guide

Or check server logs in the terminal for error messages.

