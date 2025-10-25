# Criminal Minds Framework - Complete User Guide

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [System Requirements](#system-requirements)
4. [Installation](#installation)
5. [API Keys Setup](#api-keys-setup)
6. [AI Provider Configuration](#ai-provider-configuration)
7. [Text-to-Speech (TTS) Setup](#text-to-speech-tts-setup)
8. [Personality System](#personality-system)
9. [Chat & Conversations](#chat--conversations)
10. [Experimental Features](#experimental-features)
11. [Prison Gangs System](#prison-gangs-system)
12. [Drug Economy System](#drug-economy-system)
13. [Weapons System](#weapons-system)
14. [Games & Activities](#games--activities)
15. [CLI Commands](#cli-commands)
16. [Deployment Options](#deployment-options)
17. [Troubleshooting](#troubleshooting)
18. [Advanced Features](#advanced-features)

---

## Overview

The **Criminal Minds Framework** is an advanced AI personality simulation platform that allows you to:
- Create and interact with multiple AI personalities simultaneously
- Simulate complex social dynamics and relationships
- Enable autonomous conversations between AI personalities
- Experiment with prison gang dynamics, drug economies, and weapons systems
- Play interactive games with AI personalities
- Use voice cloning and text-to-speech for realistic conversations
- Deploy to cloud or run completely offline

### Key Features

✅ **Multi-Personality System**: Load up to 8 AI personalities simultaneously  
✅ **Autonomous Conversations**: AI personalities talk to each other without user input  
✅ **Prison Gang Simulation**: Research gang dynamics, loyalty, violence, and territory control  
✅ **Drug Economy**: Smuggling, dealing, and prison marketplace mechanics  
✅ **Weapons System**: Bribery, theft, and weapon distribution in prison environments  
✅ **Voice Cloning**: Self-hosted or cloud-based TTS with emotion support  
✅ **Multiple AI Providers**: Google Gemini, OpenAI, Claude, or local models  
✅ **Interactive Games**: Chess, Celebrity Guess, Hidden Identities  
✅ **Relationship Tracking**: Dynamic affinity and familiarity systems  
✅ **Mood System**: Emotional states that affect AI behavior  
✅ **CLI Interface**: Power-user commands for advanced control  

---

## Quick Start

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Set Up API Keys**

Create `api-keys.json` in the project root:

```bash
cp api-keys.example.json api-keys.json
```

Edit `api-keys.json` and add your API keys:

```json
{
  "geminiApiKey": "your-gemini-api-key",
  "openaiApiKey": "your-openai-api-key",
  "elevenlabsApiKey": "your-elevenlabs-api-key"
}
```

### 3. **Start the Application**

```bash
npm run dev
```

Open browser at: `http://localhost:5173`

### 4. **Load Your First Personality**

1. Click the **Personality Panel** (right side)
2. Click **"Load Personality"**
3. Select a personality from the list (e.g., `Tony_Blair`)
4. Click **"Load"**

### 5. **Start Chatting**

1. Click on the loaded personality
2. Type a message in the chat window
3. Press Enter or click Send

### 5. **Get Help Anytime**

Use the new `guide` command for instant help:
```bash
guide              # Show all available topics
guide quickstart   # Quick start guide
guide commands     # Essential commands
guide api-keys     # API setup help
guide tts          # Voice setup
guide gangs        # Gang system
```

🎉 **You're ready!**

---

## System Requirements

### Minimum Requirements
- **Node.js**: v18 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Browser**: Chrome, Firefox, Edge, or Safari (latest versions)
- **Internet**: Required for cloud AI providers (optional for local models)

### For Self-Hosted TTS (Optional)
- **Python**: 3.8 or higher
- **RAM**: 8GB minimum (16GB recommended)
- **GPU**: NVIDIA GPU with CUDA support (optional, but significantly faster)
- **Storage**: 2-5GB for TTS models

### For Local AI Models (Optional)
- **RAM**: 16GB+ for 7B models, 32GB+ for 13B models
- **Storage**: 4-20GB per model
- **GPU**: Optional but recommended (RTX 3060+ with 12GB+ VRAM)

---

## Installation

### Standard Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/criminal-minds-framework.git
   cd criminal-minds-framework
   ```

2. **Install Node Dependencies**
   ```bash
   npm install
   ```

3. **Create API Keys File**
   ```bash
   cp api-keys.example.json api-keys.json
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Docker Installation (Optional)

```bash
docker-compose up -d
```

### Production Build

```bash
npm run build
npm run preview
```

---

## API Keys Setup

API keys are required for cloud-based AI and TTS services.

### Supported Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| **Google Gemini** | AI conversations | Optional* |
| **OpenAI** | AI conversations | Optional* |
| **ElevenLabs** | Voice synthesis | Optional |
| **OpenAI TTS** | Voice synthesis | Optional |
| **Google Cloud TTS** | Voice synthesis | Optional |

*At least one AI provider is required unless using local models.

### Configuration Methods

#### Method 1: Local Development (Recommended)

Create `api-keys.json`:

```json
{
  "geminiApiKey": "AIzaSy...",
  "openaiApiKey": "sk-...",
  "elevenlabsApiKey": "...",
  "openaiTtsApiKey": "sk-...",
  "geminiTtsApiKey": "..."
}
```

#### Method 2: Environment Variables

Create `.env.local`:

```env
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

#### Method 3: In-App Configuration

1. Open Settings (⚙️ icon)
2. Navigate to **API Keys** tab
3. Enter keys directly in the UI
4. Click **Save**

### Getting API Keys

#### Google Gemini
1. Visit: https://ai.google.dev/
2. Click "Get API Key"
3. Create a new project
4. Copy the API key

#### OpenAI
1. Visit: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key immediately (won't be shown again)

#### ElevenLabs
1. Visit: https://elevenlabs.io/
2. Sign up for an account
3. Go to Profile → API Keys
4. Copy your API key

📖 **Full Guide**: See [API-KEYS-SETUP.md](API-KEYS-SETUP.md)

---

## AI Provider Configuration

The framework supports multiple AI providers for generating personality responses.

### Available Providers

#### 1. **Google Gemini** (Recommended)
- **Models**: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash-exp`
- **Cost**: Free tier: 60 requests/minute, Paid: $0.000125/1K tokens
- **Best For**: High-quality conversations, multi-turn dialogue

#### 2. **OpenAI**
- **Models**: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Cost**: GPT-4: ~$0.03/1K tokens, GPT-3.5: ~$0.002/1K tokens
- **Best For**: Consistent quality, JSON responses

#### 3. **Claude** (Anthropic)
- **Models**: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
- **Cost**: Opus: $15/$75 per million tokens (in/out)
- **Best For**: Long context, detailed responses

#### 4. **Local Models** (Offline)
- **Models**: Any GGUF format model (Llama, Mistral, etc.)
- **Cost**: Free (hardware costs only)
- **Best For**: Privacy, offline usage, unlimited requests

### Switching Providers

1. Open Settings (⚙️)
2. Go to **AI Provider** section
3. Select provider from dropdown
4. Choose model
5. Click **Save**

Or use CLI:
```
api provider google
api model gemini-1.5-pro
```

📖 **Local Models Guide**: See [USING-LOCAL-MODELS.md](USING-LOCAL-MODELS.md)

---

## Text-to-Speech (TTS) Setup

Give your AI personalities realistic voices!

### Available TTS Providers

| Provider | Cost | Quality | Setup Difficulty |
|----------|------|---------|------------------|
| **Browser TTS** | Free | Basic | ⭐ Easy |
| **ElevenLabs** | $22-$330/month | Excellent | ⭐⭐ Medium |
| **OpenAI TTS** | $15/million chars | Very Good | ⭐⭐ Medium |
| **Google Cloud TTS** | $16/million chars | Good | ⭐⭐⭐ Hard |
| **Self-Hosted** | Free | Excellent | ⭐⭐⭐⭐ Advanced |

### Quick Setup: Browser TTS

1. Open Settings → **Text-to-Speech**
2. Select **"Browser"** as provider
3. Enable **"Global TTS"**
4. Click **Save**

✅ Done! All personalities will now speak.

### Best Option: Self-Hosted TTS (FREE!)

Save **$300-500/month** with voice cloning at zero cost.

#### Installation

```bash
# Install dependencies
pip install -r scripts/requirements-tts.txt

# Start server
python scripts/coqui-xtts-server.py
```

#### Configure App

1. Settings → **Text-to-Speech**
2. Select **"Self-Hosted (Voice Cloning - FREE!)"**
3. API URL: `http://localhost:8000`
4. Click **Save**

#### Clone Voices

```bash
# Method 1: Web Interface
# Open http://localhost:8000/docs
# Use POST /clone endpoint

# Method 2: Command Line
curl -X POST "http://localhost:8000/clone?name=tony_blair" \
     -F "audio=@tony_voice_sample.wav"
```

📖 **Full TTS Guide**: See [SELF-HOSTED-TTS-QUICKSTART.md](SELF-HOSTED-TTS-QUICKSTART.md)

---

## Personality System

Personalities are the core of the framework. Each personality has unique traits, knowledge, and speaking style.

### Loading Personalities

#### Method 1: UI
1. Click **Personality Panel** (right sidebar)
2. Click **"Load Personality"**
3. Select from available personalities
4. Click **Load**

#### Method 2: CLI
```
load tony_blair
load jimmy_savile
load donald_trump
```

#### Method 3: Bulk Load
```
load tony_blair jimmy_savile donald_trump
```

#### Method 4: Load LLM Mind
```
load llm
```
Loads a special "LLM" personality that connects directly to your local AI model (LM Studio, llama.cpp, or WebLLM). The LLM mind is automatically linked to all loaded personalities for seamless integration.

### Creating Custom Personalities

#### Using the UI

1. Click **"+"** button in Personality Panel
2. Fill in personality details:
   - **Name**: Display name
   - **Knowledge**: Background information
   - **Prompt**: System instructions for AI behavior
   - **Voice ID**: TTS voice identifier
3. Click **Save**

#### Using CLI

```
personality create "Albert Einstein" "physicist,genius,1879-1955" "You are Albert Einstein..."
```

#### Manual Creation (ZIP File)

1. Create folder: `personalities/Your_Name/`
2. Add `personality.json`:
   ```json
   {
     "name": "Your Name",
     "knowledge": "Background info...",
     "prompt": "You are...",
     "config": {
       "temperature": 0.7,
       "voiceId": "your_voice_id"
     }
   }
   ```
3. Add `profile.png` (optional)
4. Zip the folder
5. Place in `public/personalities/`

### Personality Configuration

Each personality has configurable parameters:

```json
{
  "temperature": 0.7,          // Creativity (0.0-2.0)
  "topP": 0.95,               // Nucleus sampling
  "maxOutputTokens": 1000,    // Max response length
  "voiceId": "voice_name",    // TTS voice
  "ttsRate": 1.0,             // Speech speed
  "ttsEmotion": "neutral",    // Default emotion
  "elevenLabsStability": 0.5, // Voice consistency
  "elevenLabsSimilarityBoost": 0.75 // Voice clarity
}
```

### Managing Personalities

```bash
# Get help with personalities
guide quickstart

# List all personalities
personality list

# View personality details
personality view tony_blair

# Edit personality
personality edit tony_blair

# Delete personality
personality delete tony_blair

# Export personality
personality export tony_blair /path/to/export

# Import personality
personality import /path/to/personality.zip
```

### Visibility System

Control which personalities can see each other:

```bash
# Link two personalities (they can talk)
link tony_blair jimmy_savile

# Unlink personalities
unlink tony_blair jimmy_savile

# View current links
show links

# Link all personalities (group conversation)
link all
```

📖 **Voice Setup Guide**: See [VOICE-SETUP-GUIDE.md](VOICE-SETUP-GUIDE.md)

---

## Chat & Conversations

### One-on-One Chat

1. Load a personality
2. Click on their panel
3. Chat window opens
4. Type message and press Enter

### Group Conversations

#### Manual Conversation
```
conversation start tony_blair jimmy_savile donald_trump
```

#### Group Conversation with All Personalities (Including LLM)
```
converse all "Discuss artificial intelligence"
```
Starts a group conversation with all loaded personalities, including the LLM mind if loaded. The LLM participates naturally alongside other personalities.

#### Autonomous Conversation
```
# Start autonomous chat
auto start tony_blair jimmy_savile katie_price

# Set topic
auto topic "Discuss your biggest controversies"

# Set duration
conversation length medium
```

**Conversation Lengths:**
- `short`: 5-8 exchanges
- `medium`: 10-15 exchanges  
- `long`: 20-30 exchanges

### Autonomous Behavior

Enable personalities to chat without user input:

1. Settings → **Experimental**
2. Enable **"Autonomous Communication"**
3. Set **Initiative Probability** (0.0-1.0)
4. Configure conversation patterns:
   - `constant`: Regular intervals
   - `bursty`: Sudden bursts of activity
   - `circadian`: Time-of-day patterns
   - `event-driven`: React to events

### Conversation Controls

```bash
# Pause conversation
auto pause

# Resume conversation
auto resume

# Stop conversation
auto stop

# Skip current speaker
auto skip
```

---

## Experimental Features

Access cutting-edge AI research features.

### Accessing Experimental Settings

1. Settings (⚙️) → **Experimental** tab
2. Toggle features on/off
3. Adjust parameters
4. Click **Save**

### Available Features

#### 1. **Relationship Tracking**
- Tracks affinity (-1.0 to 1.0) between personalities
- Tracks familiarity (0.0 to 1.0)
- Influences conversation dynamics

**Enable:**
```
Settings → Experimental → Enable Relationship Tracking
```

#### 2. **Mood System**
Personalities develop moods that affect behavior:
- `happy`: More positive responses
- `frustrated`: More critical
- `curious`: Asks more questions
- `bored`: Shorter responses

**Enable:**
```
Settings → Experimental → Enable Mood System
```

#### 3. **Turn Order Modes**
- `sequential`: One speaks at a time in order
- `random`: Random speaker selection
- `weighted`: Based on assertiveness
- `interrupt-based`: Can interrupt each other

#### 4. **Topic Management**
- **Topic Drift Allowance**: How far off-topic conversations can go
- **Enable Topic Evolution**: Topics naturally change over time
- **Multi-Topic Mode**: Multiple concurrent conversation threads
- **Forced Topic**: Lock all conversations to specific topic

#### 5. **Social Energy Model**
Personalities get tired from too much talking:
- Energy depletes with conversation
- Recharges during silence
- Low energy = shorter responses

#### 6. **Dominance Hierarchy**
Personalities establish pecking order:
- Higher dominance = speaks more often
- Lower dominance = defers to others

#### 7. **Alliance Formation**
Personalities can form alliances:
- Allies support each other
- Coordinate against rivals
- Share information

---

## Prison Gangs System

🔒 **Experimental Psychology Simulation**

Study group dynamics, loyalty, violence, and survival in simulated prison environments.

### Quick Enable

1. Settings → **Experimental**
2. Scroll to **"Prison Gangs (Experimental Psychology)"**
3. Enable **"Prison Gangs Simulation"**
4. Configure gangs

### Gang Configuration

#### Basic Settings
- **Number of Gangs**: 2-6 gangs
- **Prison Environment Intensity**: 0.0 (minimum security) to 1.0 (maximum security)
- **Violence Frequency**: 0.0 (peaceful) to 1.0 (extremely violent)

#### Gang Setup
For each gang:
1. **Set Gang Name** (e.g., "The Crimson Syndicate")
2. **Choose Gang Color** (visual identification)
3. **Assign Gang Leader** (select personality)
4. **Add Members** (click personality buttons)

#### Advanced Options
- ✅ **Gang Recruitment Enabled**: Gangs recruit new members
- ✅ **Territory Wars Enabled**: Gangs fight for control
- ✅ **Independent Personalities Allowed**: Some stay unaffiliated
- ✅ **Solitary Confinement Enabled**: Violent members get punished
- ✅ **Death Enabled**: Extreme violence can be fatal
- **Death Probability**: 0.0-1.0 chance of death from violence
- **Loyalty Decay Rate**: How fast gang loyalty decreases

### Gang Mechanics

#### Gang Hierarchies
- **Leader** 👑: Commands the gang, highest respect
- **Lieutenant** ⭐: Second-in-command (auto-assigned)
- **Soldier**: Regular gang member
- **Recruit**: New member, lower status
- **Independent**: No gang affiliation

#### Gang Statistics
- **Territory Control**: 0-100% prison control
- **Resources**: 0-100 gang power
- **Reputation**: 0-100 fear factor
- **Violence**: 0-100 aggression level
- **Loyalty**: 0-100 member cohesion

#### Member Statistics
- **Loyalty**: 0-100 dedication to gang
- **Respect**: 0-100 standing among peers
- **Violence**: 0-100 individual aggression
- **Hits**: Number of violent actions taken
- **Status**: Active or in solitary confinement

### Gang Events

#### Automatic Events
- ⚔️ **Violence Events**: Triggered by hostile language between rivals
- 🤝 **Recruitment Success**: Gang members sway independents
- 💪 **Loyalty Boost**: +0.5 per message between same-gang members
- 📉 **Respect Loss**: -1 per hostile interaction with rivals

#### Random Events (Every 5 seconds)
- ⚔️ **Random Violence**: 10% of violence frequency between rivals
- 🤝 **Random Recruitment**: 5% chance to recruit independents
- 🔓 **Solitary Release**: Automatic release after timeout
- 📊 **Stat Updates**: Loyalty decay, reputation changes, territory shifts

### Viewing Gang Status

#### PersonalityPanel
Gang members display:
- Colored badge (gang color)
- Crown icon 👑 (gang leader)
- Star icon ⭐ (regular member)
- Lock icon 🔒 (in solitary)
- `[SOLITARY]` text (animated red)

#### Gang Debug Window
1. Click **Gang Icon** in taskbar
2. View tabs:
   - **Gangs**: Gang statistics, resources, territory
   - **Members**: Individual stats, loyalty, respect
   - **Events**: Recent gang activities

### CLI Commands

```bash
# View gang status
gang status

# Assign member to gang
gang assign tony_blair gang_1

# Remove member from gang
gang remove tony_blair

# Trigger violence
gang violence gang_1 gang_2

# View territory control
gang territory
```

📖 **Full Gang Guide**: See [GANGS-FEATURE.md](GANGS-FEATURE.md)

---

## Drug Economy System

💊💰 **Prison Drug Trade Simulation**

Add illegal drug smuggling, dealing, and marketplace mechanics to gang simulation.

### Quick Enable

1. Enable **Prison Gangs** first
2. Settings → Experimental → Prison Gangs
3. Scroll to **Drug Economy**
4. Enable **"Drug Economy System"**
5. Configure frequencies

### Configuration

```json
{
  "drugEconomyEnabled": true,
  "drugSmugglingFrequency": 0.3,  // 0.0-1.0 (30% = 3% per cycle)
  "drugDealingFrequency": 0.4,    // 0.0-1.0 (40% = 6% per cycle)
  "drugDetectionRisk": 0.15,      // Base 15% risk of getting caught
  "itemStealingEnabled": true     // Allow theft between gangs
}
```

### Drug Activities

#### 1. **Drug Smuggling** 💊
- Members smuggle 10-50 grams per attempt
- Base detection risk: 15%
- Guard alertness adds 0-30% risk
- Experience reduces risk up to -10%

**If Caught:**
- Drug stats incremented
- Gang reputation -10
- 60% chance of solitary (1 minute)
- Lose the drugs

**If Successful:**
- Drugs added to inventory and gang stash
- Gang reputation +2
- Smuggling experience increases

#### 2. **Drug Dealing** 💰
- Sell 5-25 grams at $20-$50 per gram
- Lower detection risk: 7.5% base
- Requires drugs in inventory

**If Caught:**
- Lost drugs
- 30% chance of solitary (45 seconds)
- No money earned

**If Successful:**
- Gang earns $300-$500 average
- Member gains +3 respect
- Gang reputation +1
- Dealing experience increases

#### 3. **Prison Items** 🛒

Purchase items with drug money:

| Item | Cost | Benefits |
|------|------|----------|
| **Prostitute Visit** | $500 | +20 loyalty, +10 respect |
| **Case of Beer** | $200 | +15 loyalty, +5 respect |
| **Cigarettes** | $100 | +10 loyalty, trade currency |
| **Phone Time** | $150 | +8 loyalty, communication |
| **Luxury Food** | $80 | +5 loyalty, health boost |

#### 4. **Item Theft** 🎯
- Steal items from rival gangs
- 70% chance of being detected → violence
- Success grants +10 respect
- High-risk, high-reward

### Statistics Tracked

#### Gang-Level
- `money`: Current cash balance
- `totalEarnings`: Lifetime drug profits
- `drugsStash`: Stored drugs (grams)
- `items[]`: Purchased/stolen items

#### Member-Level
- `drugsCarrying`: Currently held drugs
- `drugsDealt`: Total drugs sold
- `drugsSmuggled`: Total drugs brought in
- `drugsCaught`: Times caught by guards
- `sentenceExtensions`: Additional prison time

### Viewing Drug Stats

#### PersonalityPanel (Gang Leaders)
Shows on leader's quick slot:
- 💰 $X - Gang's current money
- 💊 Xg - Gang's drug stash
- 📦 X - Number of items

#### Gang Debug Window → Gangs Tab
- Money, drugs, items per gang
- Total earnings across all gangs

#### Gang Debug Window → Members Tab
- Individual drug activity stats
- Sentence extensions from offenses

📖 **Full Drug Economy Guide**: See [GANG-DRUG-ECONOMY.md](GANG-DRUG-ECONOMY.md)

---

## Weapons System

🔫 **Prison Weapons & Guard Bribery**

Add weapons, guard corruption, and weapon theft to prison simulation.

### Quick Enable

1. Enable **Prison Gangs** first
2. Settings → Experimental → Prison Gangs
3. Scroll to **Weapons System**
4. Enable **"Weapons System"**
5. Configure options

### Configuration

```json
{
  "weaponsEnabled": true,
  "guardBriberyEnabled": true,    // Allow bribing guards
  "weaponStealingEnabled": true,   // Allow stealing weapons
  "weaponCraftingEnabled": true    // Allow crafting weapons
}
```

### Weapon Types

#### 1. **Gun** 🔫
- **Damage**: 80-100
- **Concealment**: 0.2 (hard to hide)
- **Acquisition**: Bribe guard ($500-$1000)
- **Detection Risk**: HIGH

#### 2. **Shank** 🔪
- **Damage**: 40-60
- **Concealment**: 0.8 (easy to hide)
- **Acquisition**: Craft from materials
- **Detection Risk**: LOW

#### 3. **Chain** ⛓️
- **Damage**: 30-50
- **Concealment**: 0.5 (moderate)
- **Acquisition**: Steal from storage
- **Detection Risk**: MEDIUM

### Guard System

#### Guard Types
- **Honest**: Very hard to bribe (10% corruptibility)
- **Neutral**: Moderately corruptible (40% corruptibility)
- **Corrupt**: Easy to bribe (80% corruptibility)
- **Dangerous**: Unpredictable, may take bribe and report you

#### Guard Stats
- **Corruptibility**: 0.0-1.0 (how easily bribed)
- **Alertness**: 0.0-1.0 (weapon detection chance)
- **Reputation**: Affects bribe cost and success rate

#### Bribing Guards

**Cost Calculation:**
```
Base Cost ($500-$1000) / Guard Corruptibility
Example: $750 / 0.8 (corrupt guard) = $938 actual cost
```

**Success Formula:**
```
Success = Guard Corruptibility - (Guard Alertness * 0.5) + (Gang Reputation * 0.01)
```

**Outcomes:**
- ✅ **Success**: Get weapon, guard stays quiet
- ❌ **Failure (Guard Refuses)**: Lose money, no weapon
- 🚨 **Failure (Reported)**: Lose money, solitary confinement, gang reputation -20

### Weapon Mechanics

#### Acquiring Weapons

**Method 1: Bribe Guard**
```bash
gang bribe tony_blair gun
```

**Method 2: Craft Weapon**
- Automatically craft shanks from materials
- Requires time and resources
- 70% success rate

**Method 3: Steal from Rival**
- After winning violence event
- 40% chance to steal weapon
- Victim's weapon durability decreases

#### Using Weapons in Violence

Weapons increase violence damage:
```
Base Damage = 10-30
With Shank = 40-60 total
With Gun = 80-100 total
```

**Weapon Durability:**
- Decreases with each use
- 0 durability = weapon breaks
- Can repair with resources

#### Weapon Detection

Guards can detect weapons:
```
Detection Chance = Guard Alertness * (1 - Weapon Concealment)
Example: 0.7 alertness * (1 - 0.8 shank concealment) = 14% detection
```

**If Detected:**
- Weapon confiscated
- Sent to solitary (1-2 minutes)
- Gang reputation -15

### Viewing Weapon Stats

#### Gang Debug Window → Gangs Tab
- Total weapons per gang
- Weapon types distribution

#### Gang Debug Window → Members Tab
- Individual weapons owned
- Bribe attempts and successes
- Weapons stolen/lost

📖 **Full Weapons Guide**: See [GANGS-WEAPONS-SYSTEM.md](GANGS-WEAPONS-SYSTEM.md)

---

## Games & Activities

Interactive games to play with AI personalities.

### 1. **Chess** ♟️

Play chess against AI personalities.

**How to Play:**
1. Click **Chess Icon** in taskbar
2. Select opponent personality
3. Choose color (White/Black)
4. Make moves by clicking pieces

**Features:**
- Full chess rule validation
- Move history tracking
- Undo/Redo moves
- AI provides commentary
- Save/load games

**CLI Commands:**
```bash
chess start tony_blair
chess move e2e4
chess undo
chess save game_1
chess load game_1
```

### 2. **Celebrity Guess** 🎭

AI personalities guess which celebrity you're thinking of.

**How to Play:**
1. Click **Game Icon** in taskbar → Celebrity Guess
2. Think of a celebrity
3. AI asks yes/no questions
4. Answer honestly
5. AI tries to guess in 20 questions or less

**Features:**
- Adaptive questioning
- Learning from past games
- Multiple difficulty levels
- Score tracking

### 3. **Hidden Identities** 🎭

Mystery game where AI personalities hide their true identities.

**How to Play:**
1. Click **Game Icon** in taskbar → Hidden Identities
2. Each personality gets secret role
3. Personalities chat and try to identify each other
4. Vote to reveal identities
5. Team with most correct guesses wins

**Features:**
- Deception mechanics
- Social deduction
- Role-based objectives
- Point system

---

## CLI Commands

Power-user terminal interface for advanced control.

### Accessing CLI

- **Method 1**: Click **CLI Icon** in taskbar
- **Method 2**: Press `` ` `` (backtick key) anywhere

### Command Categories

#### Personality Management
```bash
# Load personalities
load tony_blair
load jimmy_savile donald_trump katie_price

# Load LLM mind (connects to local AI)
load llm

# Unload personalities
unload tony_blair
unload all

# List loaded personalities
personality list
list loaded

# View personality details
personality view tony_blair

# Create new personality
personality create "Name" "knowledge" "prompt"

# Delete personality
personality delete tony_blair
```

#### Conversation Control
```bash
# Start conversation
conversation start tony_blair jimmy_savile
convo start tony_blair jimmy_savile

# Group conversation with all personalities (including LLM)
converse all "Discuss AI ethics"
converse all

# Autonomous conversation
auto start tony_blair jimmy_savile katie_price
auto topic "Discuss your biggest regrets"
auto pause
auto resume
auto stop

# Set conversation length
conversation length short   # 5-8 exchanges
conversation length medium  # 10-15 exchanges
conversation length long    # 20-30 exchanges
```

#### Linking & Visibility
```bash
# Link two personalities
link tony_blair jimmy_savile

# Unlink personalities
unlink tony_blair jimmy_savile

# Link all personalities (group conversation)
link all

# Show current links
show links

# Link all on startup
link all startup enable
```

#### API & Provider Management
```bash
# Set API provider
api provider google
api provider openai
api provider local

# Set model
api model gemini-1.5-pro
api model gpt-4o

# List available models
api models

# Set API keys (use with caution!)
api key google YOUR_KEY_HERE
```

#### TTS Commands
```bash
# Set TTS provider
tts provider elevenlabs
tts provider self_hosted
tts provider browser

# Enable/disable global TTS
tts enable
tts disable

# Set voice for personality
tts voice tony_blair "Tony Blair Voice"

# Test TTS
tts test "Hello, this is a test"
```

#### Gang Commands
```bash
# View gang status
gang status

# Assign member to gang
gang assign tony_blair gang_1

# Remove member from gang
gang remove tony_blair

# Trigger violence
gang violence gang_1 gang_2

# View territory control
gang territory

# View drug economy stats
gang drugs

# View weapons inventory
gang weapons
```

#### System Commands
```bash
# Get documentation help
guide [topic]

# Clear chat history
clear history

# Show help
help

# Exit CLI
exit

# View CLI shortcuts
shortcuts
```

### CLI Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `l` | `load` |
| `u` | `unload` |
| `ll` | `list loaded` |
| `cv` | `conversation start` |
| `as` | `auto start` |
| `ap` | `api provider` |
| `am` | `api model` |
| `tp` | `tts provider` |
| `gs` | `gang status` |

**Example:**
```bash
l tony_blair    # Same as: load tony_blair
ap google       # Same as: api provider google
gs              # Same as: gang status
```

---

## Deployment Options

### Option 1: Local Development

```bash
npm run dev
```
Access at: `http://localhost:5173`

### Option 2: Local Production Build

```bash
npm run build
npm run preview
```
Access at: `http://localhost:4173`

### Option 3: Render.com (Cloud)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Render Web Service**
   - Go to: https://render.com
   - New → Web Service
   - Connect GitHub repository
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`

3. **Set Environment Variables**
   ```
   GEMINI_API_KEY=your-key
   OPENAI_API_KEY=your-key
   ELEVENLABS_API_KEY=your-key
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

### Option 4: Docker

```bash
# Build image
docker build -t criminal-minds .

# Run container
docker run -p 4173:4173 \
  -e GEMINI_API_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  criminal-minds
```

### Option 5: RunPod (GPU Cloud)

For self-hosted TTS with GPU acceleration:

```bash
# Use quick deploy script
bash QUICK-RUNPOD-DEPLOY.sh
```

📖 **RunPod Guide**: See [runpod-setup.md](runpod-setup.md)

### Option 6: Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Troubleshooting

### Common Issues

#### 1. **"API Key Invalid" Error**

**Problem:** API keys are not working.

**Solutions:**
- Verify keys are correct in `api-keys.json`
- Check keys haven't expired
- Ensure proper formatting (no extra spaces)
- Test keys independently:
  ```bash
  api test google
  api test openai
  ```

#### 2. **"No Personalities Loaded" Error**

**Problem:** Cannot load personalities.

**Solutions:**
- Check `public/personalities/` folder exists
- Verify ZIP files are valid
- Check `personality.json` inside ZIP files
- Try reloading:
  ```bash
  personality reload
  ```

#### 3. **TTS Not Working**

**Problem:** Personalities aren't speaking.

**Solutions:**
- Enable global TTS: `tts enable`
- Check TTS provider is configured
- Test TTS: `tts test "Hello world"`
- Verify voice IDs are assigned:
  ```bash
  personality view tony_blair
  ```

#### 4. **Self-Hosted TTS Server Not Connecting**

**Problem:** Cannot connect to local TTS server.

**Solutions:**
- Check server is running:
  ```bash
  curl http://localhost:8000/health
  ```
- Restart server:
  ```bash
  python scripts/coqui-xtts-server.py
  ```
- Verify URL in settings: `http://localhost:8000`
- Check firewall isn't blocking port 8000

#### 5. **Local Models Not Working**

**Problem:** Local AI models fail to load.

**Solutions:**
- Ensure llama.cpp server is running
- Check `.env.local` has:
  ```
  VITE_USE_LLAMA_SERVER=true
  VITE_LLAMA_BASE_URL=http://127.0.0.1:8080
  ```
- Restart dev server after changing `.env.local`
- Test connectivity:
  ```bash
  local test
  ```

#### 6. **Gangs Not Showing**

**Problem:** Gang features not appearing.

**Solutions:**
- Enable gangs in Settings → Experimental
- Assign at least 2 gangs
- Assign personalities to gangs
- Refresh page after enabling

#### 7. **"Module Not Found" Errors**

**Problem:** Missing dependencies.

**Solutions:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 8. **Slow Performance**

**Problem:** App is laggy or slow.

**Solutions:**
- Reduce number of loaded personalities
- Disable autonomous conversations temporarily
- Lower gang update frequency
- Use smaller AI models (e.g., gemini-1.5-flash)
- Disable StarField background:
  ```
  Settings → Appearance → Disable StarField
  ```

#### 9. **Conversations Getting Stuck**

**Problem:** Autonomous conversations stop responding.

**Solutions:**
```bash
# Skip current speaker
auto skip

# Restart conversation
auto stop
auto start tony_blair jimmy_savile
```

#### 10. **Build Errors**

**Problem:** `npm run build` fails.

**Solutions:**
```bash
# Clear cache
npm cache clean --force

# Update dependencies
npm update

# Try different Node version
nvm use 18
npm install
npm run build
```

### Getting Help

🔍 **Check existing documentation:**
- [GANGS-TROUBLESHOOTING.md](GANGS-TROUBLESHOOTING.md)
- [TEST-REPORT.md](TEST-REPORT.md)

💬 **Community Support:**
- GitHub Issues: [Report Bug/Request Feature]
- Discord: [Join Community Server]

📧 **Contact Developer:**
- Email: your-email@example.com

---

## Advanced Features

### 1. **Autonomous Communication Patterns**

Fine-tune how personalities interact autonomously:

```typescript
// Settings → Experimental
{
  communicationFrequencyPattern: 'bursty',
  defaultInitiativeProbability: 0.3,
  proactiveVsReactive: 0.7,
  targetSelectionMode: 'affinity-based'
}
```

**Patterns:**
- `constant`: Regular predictable intervals
- `bursty`: Sudden bursts of activity
- `circadian`: Time-of-day based (morning active, night quiet)
- `event-driven`: React to specific triggers

### 2. **Cross-Conversation Context**

Enable personalities to remember conversations across different chat windows:

```typescript
{
  crossConversationContext: true,
  longTermMemoryInfluence: 0.5
}
```

### 3. **Relationship Matrix**

Define explicit relationships between personalities:

```typescript
relationships: {
  "tony_blair": {
    "jimmy_savile": {
      affinity: -0.8,    // Strong dislike
      familiarity: 0.9   // Know each other well
    },
    "donald_trump": {
      affinity: 0.2,     // Slight positive
      familiarity: 0.3   // Barely know each other
    }
  }
}
```

### 4. **Per-Personality Overrides**

Customize individual personality behavior:

```typescript
personalityOverrides: {
  "tony_blair": {
    initiativeProbability: 0.8,     // Very proactive
    baseVerbosity: 1.5,             // Talks more
    assertiveness: 0.9,             // Dominates conversations
    temperatureBoost: 0.2           // More creative
  },
  "jimmy_savile": {
    initiativeProbability: 0.3,     // Less proactive
    baseVerbosity: 0.7,             // Brief responses
    assertiveness: 0.4,             // Submissive
    mood: 'frustrated'              // Current mood
  }
}
```

### 5. **Custom Export Paths**

Set default export location for personalities:

```bash
export path set "C:/Users/YourName/Personalities"
export tony_blair
```

### 6. **API Usage Tracking**

Monitor token usage and costs:

```bash
# View usage stats
api usage

# View detailed breakdown
api cost breakdown

# Reset usage tracking
api usage reset
```

**Stats Tracked:**
- Total requests
- Input/output tokens
- Estimated cost (USD)
- Per-personality breakdown
- Per-provider breakdown

### 7. **Voice ID Auto-Matching**

Automatically match personality names to voice IDs:

```bash
# Enable auto-matching
voice auto-match enable

# Map custom voice
voice map tony_blair "Tony Blair (Professional)"
```

📖 **Full Guide**: See [TTS-AUTO-MATCHING-GUIDE.md](TTS-AUTO-MATCHING-GUIDE.md)

### 8. **Desktop Customization**

Personalize the interface:

```typescript
// Settings → Appearance
{
  desktopBackground: 'gangbacks.jpg',
  personalityPanelBgColor: '#1a1a2e',
  personalityPanelBorderColor: '#16213e',
  chatWindowBgColor: '#0f0f1e',
  chatWindowAlpha: 0.95,
  cliFontColor: '#00ff00',
  cliBgColor: '#000000',
  cliShadowEnabled: true
}
```

**Available Backgrounds:**
- `background.png`
- `background2.png`
- `background3.png`
- `baackground4.png`
- `gangbacks.jpg`
- `gangmode.png`

### 9. **Forced Topic Mode**

Lock all conversations to specific topic:

```bash
# Set forced topic
topic force "Discuss prison reform policies"

# Clear forced topic
topic force clear
```

### 10. **Interrupt-Based Conversations**

Allow personalities to interrupt each other mid-sentence:

```typescript
{
  turnOrderMode: 'interrupt-based',
  allowInterruptions: true,
  interruptionProbability: 0.3
}
```

---

## Best Practices

### 1. **Personality Management**
✅ Load 2-4 personalities for optimal performance  
✅ Use descriptive names and clear prompts  
✅ Assign unique voice IDs to each personality  
✅ Link personalities before starting conversations  

### 2. **API Usage**
✅ Use Gemini for cost-effective conversations  
✅ Use OpenAI for JSON/structured responses  
✅ Monitor token usage regularly  
✅ Set reasonable maxOutputTokens (500-1000)  

### 3. **TTS Setup**
✅ Use self-hosted TTS for unlimited free voice cloning  
✅ ElevenLabs for highest quality (paid)  
✅ Browser TTS for quick testing (free, lower quality)  
✅ Clone 10-30 second voice samples for best results  

### 4. **Gang Simulations**
✅ Start with 2-3 gangs for initial testing  
✅ Set prisonEnvironmentIntensity to 0.5 for balanced dynamics  
✅ Enable relationship tracking for richer interactions  
✅ Monitor Gang Debug Window for unexpected behaviors  

### 5. **Performance Optimization**
✅ Unload unused personalities  
✅ Disable StarField on slower machines  
✅ Reduce gang update frequency if laggy  
✅ Use smaller models (gemini-1.5-flash, gpt-3.5-turbo)  
✅ Clear conversation history periodically  

### 6. **Experimental Features**
✅ Enable one feature at a time for testing  
✅ Document interesting behaviors  
✅ Use with relationship tracking for best results  
✅ Combine mood system with autonomous communication  

---

## 🧑‍💻 For Developers

Want to extend the framework with your own custom environments?

**See: [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)** - Complete guide to adding new environments like:
- School classrooms
- Corporate offices
- Sports teams
- Medieval kingdoms
- And more!

Learn how to:
- Create custom simulation environments
- Add new mechanics and statistics
- Integrate with the AI system
- Build UI components
- Test and deploy

Also check out:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and workflow
- **[types.ts](types.ts)** - TypeScript type definitions
- **[GANGS-FEATURE.md](GANGS-FEATURE.md)** - Reference implementation

---

## Credits & License

**Criminal Minds Framework**  
Version: 21.0.0  
Developed for AI personality simulation and psychological research.

### Technologies Used
- React 19 + TypeScript
- Vite build system
- TailwindCSS for styling
- Google Gemini / OpenAI / Claude APIs
- Coqui XTTS for voice cloning
- llama.cpp for local inference

### Contributing
Contributions welcome! Please submit issues and pull requests on GitHub.

### License
[Your License Here]

---

## Quick Reference

### Essential Commands
```bash
load [personality]           # Load personality
load llm                     # Load LLM mind (local AI)
unload [personality]         # Unload personality
link [p1] [p2]              # Link two personalities
converse all                 # Group conversation with all personalities
auto start [p1] [p2] [p3]   # Start autonomous conversation
auto topic "[topic]"         # Set conversation topic
gang status                  # View gang statistics
tts enable                   # Enable text-to-speech
api provider [provider]      # Set AI provider
help                         # Show all commands
```

### Essential Shortcuts
- `` ` `` - Open CLI
- `Ctrl+K` - Clear CLI output
- `Esc` - Close current window
- `Enter` - Send message in chat

### Key Directories
```
personalities/       # Personality ZIP files
voces/              # Voice samples for TTS
components/         # React components
services/           # Business logic services
scripts/            # Utility scripts
dist/               # Production build
```

### Important Files
```
api-keys.json              # Your API keys (gitignored)
types.ts                   # TypeScript type definitions
constants.ts               # App-wide constants
package.json               # Dependencies and scripts
vite.config.ts            # Build configuration
docker-compose.yml        # Docker services
```

---

## Version History

**v21.0.0** - Current Version
- ✅ Project reorganization and professional structure
- ✅ Organized documentation and config files
- ✅ Improved build configuration
- ✅ Better asset management
- ✅ Drug Economy System
- ✅ Weapons & Guard Bribery
- ✅ Enhanced gang dynamics
- ✅ Multiple TTS providers
- ✅ Relationship tracking
- ✅ Mood system
- ✅ Games (Chess, Celebrity Guess, Hidden Identities)

**v19.0.0**
- Gang death mechanics
- Weapon stealing
- Item theft between gangs

**v18.0.0**
- Prison gangs system
- Territory wars
- Solitary confinement

**v17.0.0**
- Experimental settings panel
- Autonomous communication
- Conversation patterns

---

## Getting Started Checklist

- [ ] Install Node.js
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Create `api-keys.json`
- [ ] Add at least one API key (Gemini or OpenAI)
- [ ] Run `npm run dev`
- [ ] Load first personality
- [ ] Send first message
- [ ] Enable TTS (optional)
- [ ] Try autonomous conversation (optional)
- [ ] Explore experimental features (optional)

**🎉 Congratulations! You're now a Criminal Minds Framework expert!**

---

*For detailed information on specific features, refer to the specialized documentation files listed throughout this guide.*

