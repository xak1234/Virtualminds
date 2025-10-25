# Self-Hosted TTS Setup Guide
## Voice Cloning with Coqui XTTS-v2

This guide will help you set up your own voice cloning server using Coqui XTTS-v2.

---

## 💰 **Cost Savings**

- **ElevenLabs:** ~£600/month
- **Self-Hosted:** ~£0-30/month (cloud GPU optional)
- **Savings:** Up to £580/month or ~£7,000/year!

---

## 📋 **Requirements**

### **Hardware:**
- **GPU:** NVIDIA GPU with 6GB+ VRAM (RTX 3060, 4060, or better)
- **RAM:** 16GB+ recommended
- **Storage:** 10GB for models
- **OS:** Windows, Linux, or macOS

### **Software:**
- Python 3.9+ 
- NVIDIA CUDA Toolkit (for GPU acceleration)
- pip (Python package manager)

---

## 🚀 **Quick Start Installation**

### **Step 1: Install Python Dependencies**

```bash
# Create virtual environment (recommended)
python -m venv tts-env

# Activate virtual environment
# On Windows:
tts-env\Scripts\activate
# On Linux/Mac:
source tts-env/bin/activate

# Install required packages
pip install TTS fastapi uvicorn python-multipart
```

### **Step 2: Start the TTS Server**

```bash
# Navigate to your project directory
cd d:\git\criminalminds24

# Run the server
python scripts/coqui-xtts-server.py
```

**First run will take 5-10 minutes** as it downloads the XTTS-v2 model (~2GB).

You should see:
```
🎤 Coqui XTTS-v2 Self-Hosted TTS Server
Starting server on http://localhost:8000
```

### **Step 3: Configure in App**

1. Open your Criminal Minds app
2. Go to **Settings** → **Text-to-Speech**
3. Select **"Self-Hosted (Voice Cloning)"** as TTS Provider
4. Set API URL: `http://localhost:8000`
5. Click **Save**

---

## 🎙️ **Cloning Your 8 VIP Voices**

### **What You Need:**

For each personality, you need:
- **5-30 seconds** of clean audio
- Clear speech (no background noise)
- Good quality recording
- Single speaker

### **Option A: Using the Web Interface**

1. Open browser: `http://localhost:8000/docs`
2. Go to **POST /clone** endpoint
3. Click **"Try it out"**
4. Enter voice name (e.g., `tony_blair`)
5. Upload audio file (WAV format preferred)
6. Click **Execute**

### **Option B: Using curl**

```bash
curl -X POST "http://localhost:8000/clone?name=tony_blair" \
     -H "Content-Type: multipart/form-data" \
     -F "audio=@tony_blair_sample.wav"
```

### **Option C: Using Python Script**

```python
import requests

# Clone a voice
with open("tony_blair_sample.wav", "rb") as f:
    files = {"audio": f}
    response = requests.post(
        "http://localhost:8000/clone?name=tony_blair",
        files=files
    )
    print(response.json())
```

---

## 🎭 **VIP Voice Names to Clone**

Based on your requirements, clone these voices:

1. **huntley** - Ian Huntley
2. **jimmy_savile** - Jimmy Savile
3. **prince_andrew** - Prince Andrew
4. **idi_amin** - Idi Amin
5. **katie_price** - Katie Price
6. **trump** - Donald Trump
7. **keir_starmer** - Keir Starmer
8. **tony_blair** - Tony Blair

Place audio samples in the `voices/` directory:
```
voices/
  ├── huntley.wav
  ├── jimmy_savile.wav
  ├── prince_andrew.wav
  ├── idi_amin.wav
  ├── katie_price.wav
  ├── trump.wav
  ├── keir_starmer.wav
  └── tony_blair.wav
```

---

## 🧪 **Testing Your Setup**

### **Test 1: Check Server Health**

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "model": "xtts_v2"}
```

### **Test 2: List Available Voices**

```bash
curl http://localhost:8000/voices
```

Expected response:
```json
{"voices": ["tony_blair", "trump", "keir_starmer", ...]}
```

### **Test 3: Generate Speech**

```bash
curl -X POST "http://localhost:8000/tts" \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, this is a test.", "voice": "tony_blair", "language": "en"}' \
     --output test.wav
```

Then play `test.wav` to hear the result!

---

## ⚙️ **Advanced Configuration**

### **Running on a Different Port**

Edit `scripts/coqui-xtts-server.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=9000)  # Change 8000 to 9000
```

### **Running on a Remote Server**

If running on a cloud server or different machine:

1. **Update firewall** to allow port 8000
2. **In app settings**, use server IP: `http://192.168.1.100:8000`
3. **For security**, consider using HTTPS/nginx reverse proxy

### **GPU Optimization**

The script automatically uses GPU if available. To verify:

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
```

---

## 🐛 **Troubleshooting**

### **Error: "No module named 'TTS'"**
```bash
pip install TTS
```

### **Error: "CUDA not available"**
- Install NVIDIA drivers
- Install CUDA Toolkit
- Or run on CPU (slower but works)

### **Error: "Voice not found"**
- Check voice files exist in `voices/` directory
- Ensure filenames match exactly (case-sensitive)
- Files must be `.wav` format

### **Slow Generation (30+ seconds)**
- Running on CPU instead of GPU
- Install CUDA and PyTorch with CUDA support:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### **Poor Quality Output**
- Use better quality audio samples (higher bitrate)
- Provide longer samples (20-30 seconds recommended)
- Ensure samples have clear speech, no background noise

---

## 🌐 **Cloud Hosting Options**

### **RunPod (Recommended)**

1. Go to runpod.io
2. Select RTX 4090 or RTX 3090
3. Deploy PyTorch template
4. Upload your script
5. Cost: ~£0.50-0.70/hour (~£50/month for moderate use)

### **Vast.ai (Budget Option)**

1. Go to vast.ai
2. Search for RTX 3090 with 24GB VRAM
3. Select cheapest option
4. SSH in and install dependencies
5. Cost: ~£0.30/hour (~£30/month)

### **Google Colab (Free Testing)**

For testing only (not for production):
1. Go to colab.research.google.com
2. Upload the server script
3. Run with free T4 GPU
4. Note: Disconnects after inactivity

---

## 📊 **Performance Benchmarks**

| Hardware | Generation Time (10s audio) | Cost/Month |
|----------|----------------------------|------------|
| **RTX 4090** | ~2-3 seconds | £0 (local) or £50 (cloud) |
| **RTX 3090** | ~3-4 seconds | £0 (local) or £30 (cloud) |
| **RTX 3060** | ~5-7 seconds | £0 (local) |
| **CPU Only** | ~40-60 seconds | £0 |

---

## 🔒 **Security Considerations**

### **For Local Use:**
- ✅ No external API calls
- ✅ Complete privacy
- ✅ Data stays on your machine

### **For Cloud/Remote:**
- ⚠️ Use HTTPS/SSL
- ⚠️ Add authentication
- ⚠️ Whitelist IP addresses
- ⚠️ Don't expose publicly without security

---

## ✅ **Next Steps**

1. ✅ Start the server: `python scripts/coqui-xtts-server.py`
2. ✅ Clone your 8 VIP voices
3. ✅ Test generation with each voice
4. ✅ Configure app to use Self-Hosted TTS
5. ✅ **Enjoy near-zero TTS costs!** 🎉

---

## 💡 **Tips for Best Results**

- **Audio Quality:** Use high-quality samples (44.1kHz or 48kHz)
- **Sample Length:** 15-30 seconds is ideal
- **Content:** Clear speech, varied intonation
- **Format:** WAV format preferred over MP3
- **Background:** Remove background noise with Audacity
- **Multiple Samples:** Can combine multiple clips for better results

---

## 📚 **Resources**

- **Coqui TTS Documentation:** https://docs.coqui.ai/
- **XTTS-v2 Model Card:** https://huggingface.co/coqui/XTTS-v2
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Community Forum:** https://github.com/coqui-ai/TTS/discussions

---

## 🆘 **Need Help?**

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test with a simple voice sample first
4. Verify GPU is being used (if available)

---

**You're now ready to run your own voice cloning server!** 🚀

**Estimated setup time:** 30 minutes - 2 hours (depending on experience)

**Monthly savings after setup:** £550-580 compared to ElevenLabs! 💰

