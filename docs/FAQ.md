# Criminal Minds Framework - Frequently Asked Questions (FAQ)

## 📋 Table of Contents

1. [General Questions](#general-questions)
2. [Installation & Setup](#installation--setup)
3. [API Keys & Providers](#api-keys--providers)
4. [Personalities](#personalities)
5. [Text-to-Speech (TTS)](#text-to-speech-tts)
6. [Conversations](#conversations)
7. [Gang System](#gang-system)
8. [Drug Economy](#drug-economy)
9. [Weapons System](#weapons-system)
10. [Performance & Optimization](#performance--optimization)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Features](#advanced-features)

---

## General Questions

### What is the Criminal Minds Framework?

The Criminal Minds Framework is an advanced AI personality simulation platform that allows you to create, manage, and interact with multiple AI personalities. It includes unique features like autonomous conversations, prison gang dynamics, drug economy simulation, and voice cloning.

### Who is this for?

- **Researchers**: Study multi-agent AI interactions and social dynamics
- **Developers**: Build AI-powered applications and experiments
- **Creatives**: Generate dialogue and narratives
- **Educators**: Create interactive learning experiences
- **Enthusiasts**: Explore advanced AI capabilities

### Is it free to use?

The framework itself is free and open-source. However, you'll need API keys for AI providers (Google Gemini, OpenAI, or Claude), which have their own costs:
- **Google Gemini**: Free tier available, then pay-as-you-go
- **OpenAI**: Pay-as-you-go (~$0.002-0.03 per 1K tokens)
- **Local Models**: Completely free if you have the hardware

### What makes this different from ChatGPT?

- **Multiple Personalities**: Load and manage 8+ AI personalities simultaneously
- **Autonomous Conversations**: AI personalities talk to each other without your input
- **Social Dynamics**: Gangs, relationships, loyalty, violence simulation
- **Voice Cloning**: Free self-hosted or premium cloud TTS
- **Experimental Psychology**: Research-grade gang simulation features
- **Full Control**: Customize every aspect of personality behavior

---

## Installation & Setup

### What are the system requirements?

**Minimum:**
- Node.js v18+
- 4GB RAM
- 1GB storage
- Internet connection

**Recommended:**
- Node.js v20+
- 8GB RAM
- 5GB storage
- Broadband internet

### Do I need a GPU?

No GPU is required for basic usage. A GPU is only beneficial for:
- Self-hosted TTS (significantly faster voice generation)
- Local AI models (faster inference)

### Can I run this completely offline?

Yes! Use local AI models with llama.cpp and self-hosted TTS (CPU-based). You'll need to download models once with internet, then you can run offline.

### How long does setup take?

- **Basic Setup**: 5-10 minutes
- **With Self-Hosted TTS**: 15-20 minutes (first-time model download)
- **With Local AI Models**: 20-30 minutes (model download)

### I'm getting "Module not found" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## API Keys & Providers

### Which AI provider should I use?

**Google Gemini** (Recommended):
- ✅ Free tier available
- ✅ High quality
- ✅ Fast responses
- ✅ 60 requests/minute free

**OpenAI**:
- ✅ Very consistent quality
- ✅ Good for JSON responses
- ❌ More expensive

**Local Models**:
- ✅ Completely free
- ✅ No internet needed
- ✅ Complete privacy
- ❌ Requires powerful hardware

### How do I get API keys?

**Google Gemini:**
1. Visit https://ai.google.dev/
2. Click "Get API Key"
3. Create project and copy key

**OpenAI:**
1. Visit https://platform.openai.com/api-keys
2. Create new secret key
3. Copy immediately (can't view again)

**ElevenLabs:**
1. Visit https://elevenlabs.io/
2. Sign up
3. Profile → API Keys

### Are my API keys secure?

- `api-keys.json` is in `.gitignore` and never committed
- Keys are stored locally only
- For production, use environment variables
- Never share your `api-keys.json` file

### Can I use multiple API providers simultaneously?

Yes! Each personality can use a different provider if configured. The default provider is set globally but can be overridden per personality.

### How much will API calls cost?

**Typical Usage (1 hour conversation):**
- Google Gemini: $0.01 - $0.10
- OpenAI GPT-4: $0.50 - $2.00
- OpenAI GPT-3.5: $0.05 - $0.20
- Local Models: $0.00 (free)

Track usage with: `api usage` command

---

## Personalities

### How many personalities can I load?

The framework supports up to **8 personalities simultaneously** for optimal performance. You can load more, but performance may degrade.

### Where do personalities come from?

**Built-in**: The framework includes several pre-made personalities in `public/personalities/`

**Create Your Own**: Use the personality creator in the UI or create manually

**Import**: Load ZIP files containing personality data

### How do I create a custom personality?

**Method 1: UI (Easiest)**
1. Click "+" button in Personality Panel
2. Fill in name, knowledge, prompt
3. Assign voice ID
4. Click Save

**Method 2: CLI**
```bash
personality create "Name" "background info" "You are..."
```

**Method 3: Manual (Advanced)**
1. Create folder: `personalities/Name/`
2. Add `personality.json` with configuration
3. Add `profile.png` (optional)
4. Zip the folder
5. Place in `public/personalities/`

### What makes a good personality prompt?

✅ **Good:**
```
You are Tony Blair, former UK Prime Minister (1997-2007).
You are charismatic, articulate, and defensive about the Iraq War.
You speak with confidence and occasionally deflect criticism with rhetoric.
Key traits: persuasive, controversial, polarizing.
```

❌ **Bad:**
```
You are Tony.
```

**Tips:**
- Include historical context
- Define speaking style
- List key personality traits
- Mention notable events/controversies
- Add behavioral patterns

### Can personalities remember past conversations?

Yes! Conversation history is maintained for each personality. You can also enable:
- **Cross-Conversation Context**: Share memory across different chat windows
- **Long-Term Memory**: Weighted influence from older conversations

Enable in: Settings → Experimental

### How do I delete a personality?

```bash
personality delete tony_blair
```

Or manually delete the ZIP file from `public/personalities/` and reload.

---

## Text-to-Speech (TTS)

### Which TTS provider should I use?

| Provider | Best For | Cost |
|----------|----------|------|
| **Browser TTS** | Quick testing | Free |
| **Self-Hosted** | Best quality & free | Free (hardware only) |
| **ElevenLabs** | Premium quality, no setup | $22-330/month |
| **OpenAI TTS** | Good balance | $15/million chars |

**Recommendation**: Self-hosted for best value (excellent quality, zero cost)

### How do I set up self-hosted TTS?

```bash
# 1. Install dependencies
pip install -r scripts/requirements-tts.txt

# 2. Start server
python scripts/coqui-xtts-server.py

# 3. Configure in app
Settings → TTS → Self-Hosted → API URL: http://localhost:8000
```

Full guide: [SELF-HOSTED-TTS-QUICKSTART.md](SELF-HOSTED-TTS-QUICKSTART.md)

### How do I clone voices?

**Requirements:**
- 10-30 second audio sample (WAV format)
- Clear voice with minimal background noise
- Single speaker only

**Method 1: Web Interface**
1. Open http://localhost:8000/docs
2. POST /clone endpoint
3. Upload audio file
4. Enter name (e.g., `tony_blair`)

**Method 2: Command Line**
```bash
curl -X POST "http://localhost:8000/clone?name=tony_blair" \
     -F "audio=@voice_sample.wav"
```

### Why is TTS generation slow?

**Possible causes:**
- Running on CPU instead of GPU (30-60 seconds per generation)
- Large text chunks (break into smaller pieces)
- Server overload (too many concurrent requests)

**Solutions:**
- Install CUDA + PyTorch with GPU support
- Use ElevenLabs or OpenAI TTS (cloud, faster)
- Reduce text length

### Can I use different voices for each personality?

Yes! Assign voice IDs per personality:

```bash
tts voice tony_blair "Tony Blair Voice"
tts voice jimmy_savile "Jimmy Savile Voice"
```

Or set in personality configuration:
```json
{
  "config": {
    "voiceId": "tony_blair"
  }
}
```

---

## Conversations

### How do I start a conversation?

**Manual Conversation:**
1. Load personalities
2. Click on a personality
3. Type message and press Enter

**Autonomous Conversation:**
```bash
auto start tony_blair jimmy_savile katie_price
auto topic "Discuss your biggest regrets"
```

### What's the difference between manual and autonomous conversations?

**Manual:**
- You control the conversation
- Type messages yourself
- AI responds to you

**Autonomous:**
- AI personalities talk to each other
- No user input needed
- You observe and can set topics

### How do I control conversation length?

```bash
conversation length short   # 5-8 exchanges
conversation length medium  # 10-15 exchanges
conversation length long    # 20-30 exchanges
```

### Can personalities talk to anyone, or do I need to link them?

Personalities must be **linked** to see each other:

```bash
# Link two personalities
link tony_blair jimmy_savile

# Link all (group conversation)
link all
```

This simulates "knowing" each other. Unlinked personalities can't interact.

### How do I stop a runaway conversation?

```bash
# Pause (can resume later)
auto pause

# Skip current speaker
auto skip

# Stop completely
auto stop
```

### Can I force personalities to discuss a specific topic?

Yes! Use **Forced Topic Mode**:

```bash
# Set topic
topic force "Discuss prison reform policies"

# Or when starting conversation
auto start tony_blair jimmy_savile
auto topic "Debate Brexit outcomes"
```

In Settings → Experimental, you can also set a global forced topic.

---

## Gang System

### What is the gang system?

A research-grade simulation of prison gang dynamics including:
- Gang formation and hierarchies
- Territory control
- Violence and solitary confinement
- Loyalty and respect systems
- Drug economy
- Weapons and guard bribery

### How do I enable gangs?

1. Settings → **Experimental**
2. Enable **"Prison Gangs Simulation"**
3. Configure number of gangs (2-6)
4. Set gang names and colors
5. Assign leaders and members
6. Click Save

### How many gangs should I create?

**2 Gangs**: Best for studying rivalry and conflict  
**3-4 Gangs**: Good balance of dynamics  
**5-6 Gangs**: Complex politics but can be chaotic  

Start with 2-3 for your first simulation.

### What do gang statistics mean?

**Gang-Level:**
- **Territory**: % of prison controlled (affects resources)
- **Resources**: Gang power/wealth (0-100)
- **Reputation**: Fear/respect factor (0-100)
- **Violence**: Aggression tendency (0-100)
- **Loyalty**: Member cohesion (0-100)

**Member-Level:**
- **Loyalty**: Dedication to gang (0-100)
- **Respect**: Standing among peers (0-100)
- **Violence**: Individual aggression (0-100)
- **Hits**: Violence actions taken
- **Status**: Active or in solitary

### How does violence work?

**Triggers:**
- Hostile language between rival gang members
- Random violence events (based on violence frequency)
- Territory wars
- Drug deals gone wrong
- Weapon theft attempts

**Consequences:**
- Victim loses respect
- Aggressor gains respect
- Gang reputation changes
- 3+ hits → solitary confinement
- If death enabled → potential death

### Can gang members die?

Yes, if you enable the death system:

1. Settings → Experimental → Prison Gangs
2. Enable **"Death Enabled"**
3. Set **Death Probability** (0.0-1.0)

Death probability increases with:
- High violence frequency
- Weapon usage
- Multiple hits taken
- Low gang protection

When a member dies, they are removed from conversations and marked as `[KILLED]`.

### How does recruitment work?

**Active Recruitment** (conversation-based):
- Positive interactions between gang members and independents
- Sentiment analysis detects recruitment opportunities
- 15% chance per positive interaction

**Random Recruitment** (background):
- 5% chance every 5 seconds if enabled
- Based on gang reputation
- Relationship affinity
- Current gang loyalty

### What is solitary confinement?

Punishment for violent behavior:
- Triggered after 3+ hits
- Duration: 30-120 seconds (configurable)
- Member can't participate while imprisoned
- Shown with `[SOLITARY]` badge and lock icon
- Auto-released after timeout

---

## Drug Economy

### How does the drug economy work?

Gangs can:
1. **Smuggle drugs** into prison (10-50 grams)
2. **Deal drugs** for money ($20-50 per gram)
3. **Buy items** with drug money ($80-500)
4. **Steal items** from rival gangs

All activities have detection risks by guards.

### How do I enable the drug economy?

1. Enable **Prison Gangs** first
2. Settings → Experimental → Prison Gangs
3. Scroll to **Drug Economy**
4. Enable **"Drug Economy System"**
5. Set frequencies (0.0-1.0)
6. Click Save

### What happens if members get caught?

**Smuggling (caught):**
- Drugs confiscated
- Gang reputation -10
- 60% chance of solitary (1 minute)
- Sentence extended

**Dealing (caught):**
- Drugs confiscated
- 30% chance of solitary (45 seconds)
- No money earned

### What can I buy with drug money?

| Item | Cost | Benefits |
|------|------|----------|
| Prostitute Visit | $500 | +20 loyalty, +10 respect |
| Beer Case | $200 | +15 loyalty, +5 respect |
| Cigarettes | $100 | +10 loyalty |
| Phone Time | $150 | +8 loyalty |
| Luxury Food | $80 | +5 loyalty |

Items boost gang morale and loyalty.

### Can gangs steal from each other?

Yes! If item stealing is enabled:
- 70% chance of being detected
- If detected → violence breaks out
- If successful → +10 respect to thief
- High-risk, high-reward mechanic

### Where do I see drug statistics?

**PersonalityPanel** (gang leaders):
- 💰 Current money
- 💊 Drug stash
- 📦 Number of items

**Gang Debug Window → Gangs Tab:**
- Money, earnings, drugs per gang

**Gang Debug Window → Members Tab:**
- Individual drug activity
- Times caught
- Sentence extensions

---

## Weapons System

### How does the weapons system work?

Members can:
1. **Bribe guards** for weapons ($500-1000)
2. **Craft weapons** from materials
3. **Steal weapons** from rivals after violence
4. **Use weapons** in violence (increased damage)

### How do I enable weapons?

1. Enable **Prison Gangs** first
2. Settings → Experimental → Prison Gangs
3. Scroll to **Weapons System**
4. Enable **"Weapons System"**
5. Enable sub-options (bribery, stealing, crafting)
6. Click Save

### What weapon types are there?

| Type | Damage | Concealment | Acquisition |
|------|--------|-------------|-------------|
| **Gun** 🔫 | 80-100 | Low (0.2) | Bribe guard |
| **Shank** 🔪 | 40-60 | High (0.8) | Craft |
| **Chain** ⛓️ | 30-50 | Medium (0.5) | Steal |

### How do I bribe guards?

Guards have different corruptibility levels:
- **Honest**: 10% corruptible (very hard)
- **Neutral**: 40% corruptible (moderate)
- **Corrupt**: 80% corruptible (easy)
- **Dangerous**: Unpredictable (may report you)

**Bribe attempts are automatic** based on gang resources and member status.

### Can guards detect weapons?

Yes! Detection chance:
```
Detection = Guard Alertness × (1 - Weapon Concealment)
```

**Example:**
- 0.7 alertness × (1 - 0.8 shank concealment) = 14% detection

**If detected:**
- Weapon confiscated
- Solitary confinement (1-2 minutes)
- Gang reputation -15

### Do weapons break?

Yes! Weapons have durability:
- Decreases with each use
- 0 durability = weapon breaks
- Can be repaired with resources (future feature)

---

## Performance & Optimization

### The app is running slowly. How do I speed it up?

**Quick Fixes:**
1. Unload unused personalities
2. Use smaller AI models (e.g., `gemini-1.5-flash`)
3. Disable StarField background
4. Reduce number of loaded personalities (4 max)
5. Lower gang update frequency
6. Disable autonomous conversations temporarily

**Settings:**
```
Settings → Appearance → Disable StarField
Settings → Experimental → Reduce gang update interval
```

### How do I reduce API costs?

1. **Use Google Gemini** (cheapest, high quality)
2. **Use local models** (completely free)
3. **Lower maxOutputTokens** (500-1000 instead of 2000+)
4. **Reduce conversation length** (`short` instead of `long`)
5. **Monitor usage**: `api usage`
6. **Use GPT-3.5** instead of GPT-4 if using OpenAI

### How many personalities can I load without lag?

**Recommended:**
- **2-4 personalities**: Optimal performance
- **5-6 personalities**: Good performance
- **7-8 personalities**: Acceptable performance
- **9+ personalities**: Performance issues likely

### Can I run this on a Raspberry Pi?

Technically yes, but performance will be poor. Minimum recommendation: Raspberry Pi 4 with 8GB RAM. You'll need to:
- Use local models (avoid API calls)
- Disable TTS or use browser TTS
- Disable gang system
- Load 1-2 personalities max

---

## Troubleshooting

### "Failed to load API keys" error

**Solutions:**
1. Check `api-keys.json` exists in project root
2. Verify JSON is valid (use JSONLint.com)
3. Ensure file has correct format:
   ```json
   {
     "geminiApiKey": "your-key"
   }
   ```
4. Restart dev server

### Personalities won't load

**Solutions:**
1. Check `public/personalities/` folder exists
2. Verify ZIP files are valid (can extract manually)
3. Check `personality.json` is inside ZIP
4. Run `personality reload` in CLI
5. Check browser console for errors (F12)

### TTS not speaking

**Solutions:**
1. Enable global TTS: `tts enable`
2. Check TTS provider is set: `tts provider browser`
3. Test TTS: `tts test "Hello world"`
4. Verify browser audio isn't muted
5. Check personality has voice ID assigned

### Self-hosted TTS server not connecting

**Solutions:**
1. Verify server is running:
   ```bash
   curl http://localhost:8000/health
   ```
2. Check URL in settings: `http://localhost:8000` (no trailing slash)
3. Restart server:
   ```bash
   python scripts/coqui-xtts-server.py
   ```
4. Check firewall isn't blocking port 8000

### Local models not working

**Solutions:**
1. Ensure llama.cpp server is running
2. Check `.env.local`:
   ```
   VITE_USE_LLAMA_SERVER=true
   VITE_LLAMA_BASE_URL=http://127.0.0.1:8080
   ```
3. Restart dev server after changing `.env.local`
4. Test: `local test`

### Gangs not appearing

**Solutions:**
1. Enable gangs: Settings → Experimental → Enable Prison Gangs
2. Configure at least 2 gangs
3. Assign gang leaders
4. Assign members to gangs
5. Refresh page
6. Check Gang Debug Window

### Conversations getting stuck

**Solutions:**
```bash
# Skip current speaker
auto skip

# Restart conversation
auto stop
auto start tony_blair jimmy_savile
```

If persistent:
1. Unload and reload personalities
2. Clear conversation history
3. Check API provider is responding
4. Check browser console for errors

### Build errors with `npm run build`

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Try different Node version
nvm install 18
nvm use 18
npm install
npm run build
```

---

## Advanced Features

### What is the relationship tracking system?

Tracks two metrics between personalities:
- **Affinity**: -1.0 (antagonistic) to 1.0 (friendly)
- **Familiarity**: 0.0 (strangers) to 1.0 (close friends)

Changes based on:
- Conversation sentiment
- Gang affiliations
- Violence events
- Shared experiences

Enable: Settings → Experimental → Enable Relationship Tracking

### What is the mood system?

Personalities develop moods that affect behavior:
- `happy`: More positive, energetic responses
- `frustrated`: More critical, shorter responses
- `curious`: Asks more questions
- `bored`: Brief, disengaged responses
- `neutral`: Default balanced behavior

Moods change based on:
- Conversation quality
- Gang events
- Violence exposure
- Social energy levels

Enable: Settings → Experimental → Enable Mood System

### What is social energy?

A "social battery" mechanic:
- Energy depletes with conversation
- Recharges during silence
- Low energy = shorter responses, less initiative
- High energy = more proactive, longer responses

Simulates realistic social fatigue.

Enable: Settings → Experimental → Enable Social Energy Model

### What are personality overrides?

Per-personality customization of behavior:
```typescript
{
  "tony_blair": {
    "initiativeProbability": 0.8,  // Very proactive
    "baseVerbosity": 1.5,          // Talks more
    "assertiveness": 0.9,          // Dominates conversations
    "temperatureBoost": 0.2        // More creative
  }
}
```

Set in: Settings → Experimental → Per-Personality Overrides

### How do I export/import personalities?

**Export:**
```bash
# Set export path
export path set "C:/Users/YourName/Personalities"

# Export personality
personality export tony_blair
```

**Import:**
```bash
personality import /path/to/personality.zip
```

Or manually place ZIP file in `public/personalities/` and reload.

### Can I use this for commercial projects?

Check the LICENSE file for specific terms. Generally, if MIT licensed, yes with attribution.

### How do I contribute to the project?

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Test thoroughly
5. Submit pull request
6. Respond to code review

See CONTRIBUTING.md (if exists) for detailed guidelines.

---

## Still Have Questions?

📖 **Read the Complete Guide**: [USER-GUIDE.md](USER-GUIDE.md)  
🔍 **Check Troubleshooting**: [GANGS-TROUBLESHOOTING.md](GANGS-TROUBLESHOOTING.md)  
💬 **Join Discord**: [Community Server]  
🐛 **Report Bug**: GitHub Issues  
📧 **Email Support**: your-email@example.com  

---

**Last Updated**: 2025-10-23  
**Version**: 21.0.0

