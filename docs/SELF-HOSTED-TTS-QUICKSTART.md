# Self-Hosted TTS - Quick Start Guide
## Get Your Voice Cloning Running in 10 Minutes!

---

## 🚀 **Super Quick Setup (3 Steps)**

### **1. Install Python Dependencies**

```bash
pip install -r scripts/requirements-tts.txt
```

*First time will download ~2GB of AI models (5-10 minutes)*

---

### **2. Start the Server**

```bash
python scripts/coqui-xtts-server.py
```

You should see:
```
🎤 Coqui XTTS-v2 Self-Hosted TTS Server
Starting server on http://localhost:8000
```

---

### **3. Configure Your App**

1. Open Criminal Minds Framework
2. Go to **Settings** → **Text-to-Speech**
3. Select **"Self-Hosted (Voice Cloning - FREE!)"**
4. API URL: `http://localhost:8000`
5. Click **Save**

---

## 🎭 **Clone Your First Voice**

### **Method 1: Web Interface** (Easiest)

1. Open browser: `http://localhost:8000/docs`
2. Click **POST /clone**
3. Click **"Try it out"**
4. Enter name: `tony_blair`
5. Upload audio file (WAV, 10-30 seconds)
6. Click **Execute**
7. Done! ✅

### **Method 2: Command Line**

```bash
curl -X POST "http://localhost:8000/clone?name=tony_blair" \
     -F "audio=@tony_blair_sample.wav"
```

---

## ✅ **Test It**

1. Load Tony Blair personality in your app
2. Chat with him
3. **Voice should automatically use your cloned voice!**

---

## 🎤 **Clone Your 8 VIP Voices**

You need audio samples (10-30 seconds each):

1. **huntley** - Ian Huntley
2. **jimmy_savile** - Jimmy Savile
3. **prince_andrew** - Prince Andrew
4. **idi_amin** - Idi Amin
5. **katie_price** - Katie Price
6. **trump** - Donald Trump
7. **keir_starmer** - Keir Starmer
8. **tony_blair** - Tony Blair

Use the same method to clone each voice!

---

## 💰 **Expected Costs**

| Setup | Cost |
|-------|------|
| **With GPU (local)** | £0/month |
| **CPU only (local)** | £0/month (slower) |
| **Cloud GPU (RunPod)** | £30-50/month |

**Savings vs ElevenLabs:** £550-570/month!

---

## 🐛 **Troubleshooting**

### **"No module named 'TTS'"**
```bash
pip install TTS
```

### **"Connection refused"**
Make sure server is running:
```bash
python scripts/coqui-xtts-server.py
```

### **Slow generation (30+ seconds)**
- Running on CPU (normal, but slow)
- For GPU speed: Install CUDA + PyTorch with CUDA

---

## 📚 **Full Documentation**

See `SELF-HOSTED-TTS-SETUP.md` for:
- Detailed installation instructions
- GPU setup guide
- Cloud hosting options
- Advanced configuration
- Performance optimization

---

## ✨ **You're Done!**

You now have:
- ✅ Self-hosted voice cloning
- ✅ Near-zero costs
- ✅ Unlimited usage
- ✅ Complete privacy

**Start cloning voices and saving money!** 💰🎉

