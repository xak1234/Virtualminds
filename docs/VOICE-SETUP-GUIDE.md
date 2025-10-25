# Voice Setup Guide - Your 6 Voices

## 📁 Step 1: Copy Files to `voces` Folder

Copy these 6 files into the `voces` folder:
- andrew.mp3
- jimmy.mp3
- katey.wav
- shann.mp3
- tony.wav
- yorkshire.mp3

**Note:** MP3 files work fine! No need to convert unless you want maximum quality.

---

## 🔄 Step 2: Restart TTS Server

After copying files, restart the server:
1. Close the current `start-python-tts.bat` window (CTRL+C)
2. Double-click `start-python-tts.bat` again

The server will find your 6 voices automatically.

---

## 🎯 Step 3: Voice Mapping (for your app)

Your app needs to know which file goes with which personality.

**Update `voice-id-mappings.json` with these mappings:**

```json
{
  "voice_mappings": {
    "prince_andrew": {
      "voice_id": "andrew",
      "keywords": ["prince", "andrew", "royal", "duke"],
      "description": "Prince Andrew voice"
    },
    "jimmy_savile": {
      "voice_id": "jimmy",
      "keywords": ["jimmy", "savile", "jim"],
      "description": "Jimmy Savile voice"
    },
    "katie_price": {
      "voice_id": "katey",
      "keywords": ["katie", "price", "katie price", "kp", "katey", "jordan"],
      "description": "Katie Price voice"
    },
    "karen_shannon": {
      "voice_id": "shann",
      "keywords": ["karen", "shannon"],
      "description": "Karen Shannon voice"
    },
    "tony_blair": {
      "voice_id": "tony",
      "keywords": ["tony", "blair", "prime minister", "british", "politician"],
      "description": "Tony Blair voice"
    },
    "yorkshire_rip": {
      "voice_id": "yorkshire",
      "keywords": ["yorkshire", "rip", "northern", "british"],
      "description": "Yorkshire RIP voice"
    }
  }
}
```

**Important:** Use the filename **without** the extension:
- `andrew.mp3` → `"voice_id": "andrew"`
- `katey.wav` → `"voice_id": "katey"`

---

## ✅ Step 4: Test It!

1. Open Criminal Minds app
2. Go to Settings → Text-to-Speech
3. Select **"Self-Hosted"**
4. API URL: `http://localhost:8000`
5. Load a personality (e.g., Tony Blair)
6. Chat and listen to the cloned voice!

---

## 🎤 Voice Quality Tips

### **Your Current Files:**
- ✅ `katey.wav` - Already WAV (best quality)
- ✅ `tony.wav` - Already WAV (best quality)
- 🟡 `andrew.mp3` - Works, but WAV would be better
- 🟡 `jimmy.mp3` - Works, but WAV would be better
- 🟡 `shann.mp3` - Works, but WAV would be better
- 🟡 `yorkshire.mp3` - Works, but WAV would be better

### **Optional: Convert MP3 to WAV**

If you want maximum quality, use an online converter:
- https://cloudconvert.com/mp3-to-wav
- https://convertio.co/mp3-wav/
- Or use FFmpeg: `ffmpeg -i andrew.mp3 andrew.wav`

---

## 📊 Summary

| File | Use As | Maps To |
|------|--------|---------|
| andrew.mp3 | andrew | Prince Andrew |
| jimmy.mp3 | jimmy | Jimmy Savile |
| katey.wav | katey | Katie Price |
| shann.mp3 | shann | Karen Shannon |
| tony.wav | tony | Tony Blair |
| yorkshire.mp3 | yorkshire | Yorkshire Ripper |

---

## 🚀 You're Ready!

1. Copy files to `voces` folder ✓
2. Restart TTS server ✓
3. Update voice mappings ✓
4. Configure app settings ✓
5. Start chatting! ✓

