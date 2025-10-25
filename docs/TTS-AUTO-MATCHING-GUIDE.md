# TTS Auto-Matching Guide

## 🎯 **How It Works**

Your Criminal Minds app now automatically matches personality names to your self-hosted voice files!

---

## 📁 **Your Voice Files**

Located in: `voces/`

```
andrew.wav    → Prince Andrew
jimmy.wav     → Jimmy Savile
katey.wav     → Katie Price
shann.wav     → Karen Shannon
tony.wav      → Tony Blair
yorkshire.wav → Yorkshire Ripper
```

---

## 🔄 **Auto-Matching System**

When you load a personality for the first time, the system:

1. **Checks** if a voice is already assigned in the registry
2. **If not**, looks for the best matching voice file:
   - Checks personality name against aliases (e.g., "Tony Blair" → `tony`)
   - Uses fuzzy matching (e.g., "Katie Price" → `katey`)
   - Finds closest match from available voices
3. **Saves** the match automatically for future use
4. **Uses** that voice for TTS generation

---

## 🎤 **Voice Mapping Table**

| Voice File | Automatically Matches | Aliases |
|------------|----------------------|---------|
| `andrew` | Prince Andrew, Andrew, Duke of York | prince_andrew, prince andrew, andrew |
| `jimmy` | Jimmy Savile, Jimmy, Jim Savile | jimmy_savile, jimmy savile, jimmy, savile |
| `katey` | Katie Price, Katie, KP, Jordan | katie_price, katie price, katie, katey, kp, jordan |
| `shann` | Karen Shannon, Karen, Shannon | karen_shannon, karen shannon, karen, shannon, shann |
| `tony` | Tony Blair, Tony, Blair, PM Blair | tony_blair, tony blair, tony, blair |
| `yorkshire` | Yorkshire Ripper, Yorkshire, RIP | yorkshire_rip, yorkshire ripper, yorkshire, rip |

---

## ✅ **Setup Steps**

### **1. Start TTS Server**

```bash
start-python-tts.bat
```

The server will:
- ✅ Load the 1.87 GB AI model
- ✅ Detect all 6 voices in `voces` folder
- ✅ Start on `http://localhost:8000`

### **2. Configure App**

1. Open **Settings** → **Text-to-Speech**
2. Select **"Self-Hosted (Voice Cloning - FREE!)"**
3. API URL: `http://localhost:8000` (default)
4. Click **Save**

### **3. Load a Personality**

Just load any of your personalities (Tony Blair, Katie Price, etc.) and **start chatting!**

The app will:
- ✅ Auto-detect the personality name
- ✅ Match it to the correct voice file
- ✅ Save the mapping for future use
- ✅ Generate speech with that voice

---

## 🔧 **Manual Override**

If you want to manually assign voices:

1. Go to **Settings** → **Voice ID Registry**
2. Select a personality
3. Enter the voice file name (e.g., `tony`, `katey`, `andrew`)
4. Save

---

## 🐛 **Troubleshooting**

### **"No voice found for this personality"**

**Cause:** The personality name doesn't match any voice files.

**Fix:**
1. Check voice files in `voces` folder
2. Rename voice file to match personality (e.g., `hitler.wav` for Adolf Hitler)
3. Restart TTS server
4. OR manually assign voice in Voice ID Registry

### **"Self-Hosted TTS server not available"**

**Cause:** TTS server not running.

**Fix:**
1. Run `start-python-tts.bat`
2. Wait ~30 seconds for model to load
3. Check http://localhost:8000/health

### **"Connection refused"**

**Cause:** Wrong API URL or server not started.

**Fix:**
1. Verify server is running: `start-python-tts.bat`
2. Check API URL in Settings: `http://localhost:8000`
3. Test: `curl http://localhost:8000/voices`

---

## 📊 **What Gets Saved**

The Voice ID Registry stores:
```json
{
  "personality_id_123": "tony",
  "personality_id_456": "katey",
  "personality_id_789": "andrew"
}
```

Located in: `localStorage` → `cmf_voice_id_map`

---

## 💡 **Tips**

1. **Name your voice files clearly** (e.g., `trump.wav`, `hitler.wav`) for easy matching
2. **First chat saves the mapping** - subsequent chats use the saved voice
3. **Add new voices** by dropping WAV files in `voces` folder and restarting server
4. **Check console logs** to see which voice was matched

---

## 🎉 **You're Done!**

The system now automatically matches your personalities to voices!

**What to expect:**
- ✅ Load Tony Blair → Uses `tony` voice
- ✅ Load Katie Price → Uses `katey` voice
- ✅ Load Prince Andrew → Uses `andrew` voice
- ✅ Load Jimmy Savile → Uses `jimmy` voice
- ✅ Load Karen Shannon → Uses `shann` voice
- ✅ Load Yorkshire Ripper → Uses `yorkshire` voice

---

## 📚 **Additional Resources**

- `VOICE-SETUP-GUIDE.md` - Voice file setup instructions
- `SELF-HOSTED-TTS-QUICKSTART.md` - Quick start guide
- `SELF-HOSTED-TTS-SETUP.md` - Detailed setup instructions
- `PYTHON-TTS-SETUP.md` - Python installation guide

---

**Happy chatting with voice-cloned personalities!** 🎭🎤

