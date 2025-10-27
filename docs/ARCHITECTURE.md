# Criminal Minds Framework - Architecture & Workflow Guide

## 📐 System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Criminal Minds Framework                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Services   │  │  External    │      │
│  │   (React)    │──│   (Logic)    │──│   APIs       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│                           │                                   │
│                    ┌──────▼──────┐                           │
│                    │   Storage   │                           │
│                    │ (LocalStore)│                           │
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Architecture

### 1. Frontend Layer (React + TypeScript)

```
App.tsx (Root)
├── Header.tsx
├── PersonalityPanel.tsx
│   ├── PersonalityLoadModal.tsx
│   ├── PersonalityDetailsModal.tsx
│   └── CreatePersonalityModal.tsx
├── DraggableWindow.tsx
│   └── ChatWindow.tsx
├── Cli.tsx
├── SettingsModal.tsx
│   └── ExperimentalSettingsPanel.tsx
├── Taskbar.tsx
├── AdminDebugWindow.tsx
├── GangDebugWindow.tsx
├── ApiDebugWindow.tsx
├── Games/
│   ├── ChessGameWindow.tsx
│   ├── CelebrityGuessGame.tsx
│   └── HiddenIdentitiesGame.tsx
└── StarField.tsx
```

### 2. Services Layer (Business Logic)

```
services/
├── AI Providers
│   ├── geminiService.ts          # Google Gemini API integration
│   ├── openaiService.ts          # OpenAI GPT API integration
│   ├── claudeService.ts          # Claude API integration
│   ├── localModelService.ts      # WebLLM browser models
│   └── llamaCppService.ts        # llama.cpp server integration
│
├── TTS Providers
│   ├── ttsService.ts             # TTS orchestrator
│   ├── elevenlabsService.ts      # ElevenLabs API
│   ├── openaiTtsService.ts       # OpenAI TTS API
│   ├── geminiTtsService.ts       # Google Cloud TTS
│   ├── azureTtsService.ts        # Azure Cognitive Services
│   ├── (removed) playhtTtsService.ts       # Play.ht API (removed)
│   └── selfHostedTtsService.ts   # Coqui XTTS server
│
├── Core Features
│   ├── personalityService.ts     # Personality management
│   ├── userService.ts            # User data management
│   ├── costTrackingService.ts    # Token usage tracking
│   └── textFilterService.ts      # Content filtering
│
├── Experimental
│   ├── gangService.ts            # Gang simulation
│   ├── gangSoundService.ts       # Gang sound effects
│   └── chessService.ts           # Chess game logic
│
├── Utilities
│   ├── apiKeyService.ts          # API key loading
│   ├── apiKeyValidationService.ts # Key validation
│   ├── voiceMappingService.ts    # Voice ID mapping
│   ├── voiceIdRegistryService.ts # Voice registry
│   └── cliCommandUtils.ts        # CLI helpers
│
└── Games
    ├── celebrityGuessService.ts   # Celebrity guessing
    └── hiddenIdentitiesGameService.ts # Identity game
```

### 3. External APIs

```
┌──────────────┐
│  Google      │
│  Gemini API  │◄─── AI Conversations
└──────────────┘

┌──────────────┐
│  OpenAI      │
│  GPT API     │◄─── AI Conversations
└──────────────┘

┌──────────────┐
│  ElevenLabs  │
│  TTS API     │◄─── Voice Synthesis
└──────────────┘

┌──────────────┐
│  llama.cpp   │
│  Server      │◄─── Local AI (offline)
└──────────────┘

┌──────────────┐
│  Coqui XTTS  │
│  Server      │◄─── Voice Cloning (offline)
└──────────────┘
```

---

## 🔄 Data Flow

### Conversation Flow

```
User Input
    │
    ▼
┌──────────────────┐
│  ChatWindow      │
│  (UI Component)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  App.tsx         │
│  (State Manager) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AI Service      │
│  (gemini/openai) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  External API    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AI Response     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  TTS Service     │
│  (Optional)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Audio Output    │
│  (Speaker)       │
└──────────────────┘
```

### Autonomous Conversation Flow

```
Auto Start Trigger
    │
    ▼
┌──────────────────┐
│  Select Next     │
│  Speaker         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Build Context   │
│  (History +      │
│   Relationships) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Select Target   │
│  Personality     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Response        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Update State    │
│  (Relationships, │
│   Gang Stats)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  TTS + Display   │
└────────┬─────────┘
         │
         ▼
    [Loop Back]
```

### Gang System Data Flow

```
Gang Update Trigger (Every 5 seconds)
    │
    ▼
┌──────────────────────┐
│  Process Gang Events │
│  - Violence          │
│  - Recruitment       │
│  - Drug Activities   │
│  - Weapon Actions    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Update Statistics   │
│  - Loyalty decay     │
│  - Territory shifts  │
│  - Respect changes   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Generate Events     │
│  - Violence results  │
│  - Drug busts        │
│  - Solitary releases │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Update UI           │
│  - Gang badges       │
│  - Debug window      │
│  - CLI output        │
└──────────────────────┘
```

---

## 💾 Data Storage

### LocalStorage Structure

```javascript
// API Configuration
localStorage.setItem('apiProvider', 'google')
localStorage.setItem('currentModel', 'gemini-1.5-pro')
localStorage.setItem('geminiApiKey', 'encrypted-key')

// Personality Data
localStorage.setItem('allPersonalities', JSON.stringify([...]))
localStorage.setItem('activePersonalities', JSON.stringify([...]))

// User Data
localStorage.setItem('userData', JSON.stringify({
  username: 'user1',
  conversations: { ... },
  apiUsage: { ... }
}))

// Experimental Settings
localStorage.setItem('experimentalSettings', JSON.stringify({
  gangsEnabled: true,
  gangsConfig: { ... },
  relationships: { ... }
}))

// TTS Configuration
localStorage.setItem('ttsProvider', 'self_hosted')
localStorage.setItem('globalTtsEnabled', 'true')

// UI Preferences
localStorage.setItem('theme', 'dark')
localStorage.setItem('desktopBackground', 'gangbacks.jpg')
```

---

## 🎯 Feature Modules

### 1. Personality System

**Purpose**: Manage AI personality instances

**Components**:
- `PersonalityPanel.tsx` - UI for loading/managing
- `personalityService.ts` - CRUD operations
- `PersonalityLoadModal.tsx` - Selection interface
- `CreatePersonalityModal.tsx` - Creation wizard

**Data Flow**:
```
ZIP File → Extract → Parse personality.json → Validate → Load → Store
```

**Storage**:
- ZIP files in `public/personalities/`
- Metadata in localStorage
- Profile images as base64 data URLs

---

### 2. Gang System

**Purpose**: Simulate prison gang dynamics

**Components**:
- `ExperimentalSettingsPanel.tsx` - Configuration UI
- `gangService.ts` - Gang logic engine
- `GangDebugWindow.tsx` - Real-time monitoring
- `gangSoundService.ts` - Audio feedback

**Update Cycle** (Every 5 seconds):
```javascript
1. Check for random violence (10% of violence frequency)
2. Attempt random recruitment (5% chance)
3. Process drug smuggling (frequency-based)
4. Process drug dealing (frequency-based)
5. Update loyalty (apply decay)
6. Update territory (based on violence)
7. Release from solitary (check timeouts)
8. Process weapon actions
9. Generate gang events
10. Update UI badges and stats
```

**Data Structure**:
```typescript
Gang {
  id: string
  name: string
  color: string
  leaderId: string | null
  memberIds: string[]
  territoryControl: number
  resources: number
  reputation: number
  violence: number
  loyalty: number
  weapons: Weapon[]
  money: number
  drugsStash: number
  items: PrisonItem[]
}
```

---

### 3. Drug Economy

**Purpose**: Simulate prison drug trade

**Activities**:
1. **Smuggling** (every 5s, frequency-based)
   - Random member attempts
   - Detection risk check
   - Success: add drugs + reputation
   - Failure: solitary + reputation loss

2. **Dealing** (every 5s, frequency-based)
   - Members with drugs attempt to deal
   - Lower detection risk than smuggling
   - Earnings: $20-50 per gram
   - Success: money + respect

3. **Item Purchase** (manual trigger)
   - Gang uses money to buy items
   - Items provide loyalty bonuses
   - Stored in gang inventory

4. **Item Theft** (random, 5% chance)
   - Target random rival gang
   - 70% detection risk
   - Success: steal item + respect
   - Failure: violence triggers

**Statistics Tracked**:
```typescript
GangMemberStatus {
  // Drug stats
  drugsCarrying: number        // Current inventory
  drugsDealt: number           // Lifetime dealt
  drugsSmuggled: number        // Lifetime smuggled
  drugsCaught: number          // Times caught
  sentenceExtensions: number   // Added time
  totalDrugEarnings: number    // Total $ earned
}
```

---

### 4. Weapons System

**Purpose**: Simulate weapon acquisition and usage

**Acquisition Methods**:
1. **Guard Bribery**
   ```javascript
   Cost = Base ($500-1000) / Guard Corruptibility
   Success = Guard Corruptibility - (Alertness * 0.5)
   ```

2. **Weapon Crafting**
   - Automatic for gang members
   - 70% success rate
   - Creates shanks (40-60 damage)

3. **Weapon Theft**
   - After winning violence
   - 40% chance to steal weapon
   - Victim weapon durability decreases

**Usage in Violence**:
```javascript
Base Damage = 10-30
With Shank = 40-60
With Chain = 30-50  
With Gun = 80-100
```

**Detection System**:
```javascript
Detection Chance = Guard Alertness × (1 - Weapon Concealment)

Examples:
- Gun (0.2 concealment): 0.7 alertness × 0.8 = 56% detection
- Shank (0.8 concealment): 0.7 alertness × 0.2 = 14% detection
```

---

### 5. TTS System

**Purpose**: Convert text to speech with personality voices

**Provider Selection Logic**:
```javascript
if (ttsProvider === 'browser') {
  use Web Speech API
} else if (ttsProvider === 'elevenlabs') {
  call ElevenLabs API
} else if (ttsProvider === 'self_hosted') {
  call local XTTS server
} else if (ttsProvider === 'openai') {
  call OpenAI TTS API
}
```

**Voice Matching**:
```javascript
1. Check personality.config.voiceId
2. If not found, check voiceIdRegistry
3. If not found, check voiceMappingService (auto-match)
4. If not found, use default voice
```

**Self-Hosted TTS Flow**:
```
Text → TTS Service → HTTP Request → Coqui XTTS Server
                                          ↓
Audio Array ← HTTP Response ← WAV File Generation
    ↓
Browser Audio API → Speaker
```

---

### 6. Conversation System

**Types**:

**A. Manual Conversation**
```
User types message
  → Send to AI provider
  → Get response
  → Display + optional TTS
  → Wait for next user input
```

**B. Autonomous Conversation**
```
Timer triggers (based on frequency pattern)
  → Select next speaker (turn order mode)
  → Select target personality
  → Build conversation context
  → Generate AI response
  → Process gang interactions
  → Update relationships
  → Display + TTS
  → Loop back
```

**Context Building**:
```javascript
Context = [
  System Prompt (personality knowledge + behavior)
  + Gang Context (if enabled)
  + Relationship Context (if enabled)
  + Mood Context (if enabled)
  + Conversation History (last N messages)
  + Cross-Conversation Context (if enabled)
  + Forced Topic (if set)
]
```

**Turn Order Modes**:
- **Sequential**: A → B → C → A (fixed order)
- **Random**: Random selection each turn
- **Weighted**: Based on assertiveness values
- **Interrupt-Based**: Can interrupt mid-conversation

---

## 🔌 API Integration

### Google Gemini

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Request**:
```javascript
{
  contents: [{
    parts: [{ text: "conversation context" }],
    role: "user"
  }],
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 1000
  }
}
```

**Response Processing**:
```javascript
response.candidates[0].content.parts[0].text
```

---

### OpenAI GPT

**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Request**:
```javascript
{
  model: "gpt-4o",
  messages: [
    { role: "system", content: "personality prompt" },
    { role: "user", content: "conversation context" }
  ],
  temperature: 0.7,
  max_tokens: 1000
}
```

**Response Processing**:
```javascript
response.choices[0].message.content
```

---

### ElevenLabs TTS

**Endpoint**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Request**:
```javascript
{
  text: "text to speak",
  model_id: "eleven_monolingual_v1",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }
}
```

**Response Processing**:
```javascript
ArrayBuffer → Audio Context → Speaker
```

---

### Self-Hosted XTTS

**Endpoint**: `http://localhost:8000/tts`

**Request**:
```javascript
POST /tts
{
  text: "text to speak",
  speaker_wav: "voice_id",
  language: "en"
}
```

**Voice Cloning**:
```javascript
POST /clone?name=voice_id
FormData: { audio: WAV_FILE }
```

---

## 🚀 Deployment Architecture

### Local Development

```
┌─────────────┐
│   Vite Dev  │
│   Server    │
│  (Port 5173)│
└─────────────┘
```

### Local Production

```
┌─────────────┐      ┌──────────────┐
│   Vite      │ →    │   Preview    │
│   Build     │      │   Server     │
│             │      │  (Port 4173) │
└─────────────┘      └──────────────┘
```

### Docker Deployment

```
┌─────────────────────────────────────┐
│          Docker Container           │
│                                     │
│  ┌──────────────┐                  │
│  │   Node.js    │                  │
│  │   Runtime    │                  │
│  └──────┬───────┘                  │
│         │                           │
│  ┌──────▼───────┐                  │
│  │  Vite Build  │                  │
│  │  (Static)    │                  │
│  └──────┬───────┘                  │
│         │                           │
│  ┌──────▼───────┐                  │
│  │  HTTP Server │                  │
│  │  (Port 4173) │                  │
│  └──────────────┘                  │
│                                     │
└─────────────────────────────────────┘
```

### Cloud Deployment (Render.com)

```
┌─────────────────────────────────────┐
│          Render.com Web Service     │
│                                     │
│  ┌──────────────┐                  │
│  │  Build Phase │                  │
│  │  npm install │                  │
│  │  npm build   │                  │
│  └──────┬───────┘                  │
│         │                           │
│  ┌──────▼───────┐                  │
│  │  Start Phase │                  │
│  │  npm start   │                  │
│  └──────┬───────┘                  │
│         │                           │
│  ┌──────▼───────┐                  │
│  │  HTTP Server │                  │
│  │  (Port 4173) │◄─── External URL │
│  └──────────────┘                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### API Keys
- ✅ Stored in `api-keys.json` (gitignored)
- ✅ Loaded at runtime, not bundled
- ✅ Never logged or exposed in UI
- ⚠️ Use environment variables in production

### User Data
- ✅ Stored locally (no server transmission)
- ✅ No analytics or tracking
- ✅ No third-party cookies
- ⚠️ Clear localStorage to delete all data

### AI Content
- ⚠️ Gang simulations may generate violent content
- ⚠️ Personality responses not filtered by default
- ✅ `textFilterService.ts` available for content filtering
- ⚠️ Use responsibly for research purposes only

---

## 📊 Performance Considerations

### Bottlenecks

1. **AI API Calls** (500-2000ms)
   - Mitigation: Use faster models (gemini-flash)
   - Mitigation: Local models for offline

2. **TTS Generation** (1000-5000ms)
   - Mitigation: Use cloud TTS (faster)
   - Mitigation: GPU acceleration for self-hosted

3. **Gang Updates** (every 5s)
   - Mitigation: Reduce update frequency
   - Mitigation: Limit gang size (2-4 gangs)

4. **LocalStorage Read/Write**
   - Mitigation: Cache frequently accessed data
   - Mitigation: Batch writes

### Optimization Strategies

**Frontend**:
- ✅ React.memo for expensive components
- ✅ useMemo/useCallback for complex calculations
- ✅ Lazy loading for modals and games
- ✅ Virtual scrolling for long chat histories

**API Usage**:
- ✅ Debounce rapid requests
- ✅ Queue management for concurrent requests
- ✅ Token usage tracking and limits
- ✅ Error retry with exponential backoff

**Gang System**:
- ✅ Process events in batches
- ✅ Update UI only when visible
- ✅ Throttle debug window updates
- ✅ Skip processing for inactive gangs

---

## 🧪 Testing Strategy

### Unit Tests (Future)
```
services/
  ├── gangService.test.ts
  ├── personalityService.test.ts
  └── ttsService.test.ts
```

### Integration Tests (Future)
```
tests/
  ├── conversation-flow.test.ts
  ├── gang-violence.test.ts
  └── tts-integration.test.ts
```

### Manual Testing Checklist
- [ ] Load personality
- [ ] Send message
- [ ] Enable TTS
- [ ] Start autonomous conversation
- [ ] Enable gangs
- [ ] Assign gang members
- [ ] Trigger violence
- [ ] Enable drug economy
- [ ] Enable weapons system
- [ ] Play chess game
- [ ] Export personality
- [ ] Test all CLI commands

---

## 🔄 Update & Maintenance

### Version Control
```
v21.0.0 - Current
  ├── Project Reorganization
  ├── Professional File Structure
  ├── Organized Documentation
  ├── Improved Build Configuration
  ├── Drug Economy System
  ├── Weapons System
  ├── Enhanced Gang Dynamics
  └── Multiple TTS Providers

v19.0.0
  ├── Gang Death Mechanics
  └── Weapon Stealing

v18.0.0
  ├── Prison Gangs System
  └── Territory Wars
```

### Migration Path
```
v17.x → v18.x: Add gangs configuration
v18.x → v19.x: Add death system
v19.x → v20.x: Add drug economy + weapons
v20.x → v21.x: Project reorganization and improvements
```

---

## 📚 Further Reading

- **[USER-GUIDE.md](USER-GUIDE.md)** - Complete user documentation
- **[types.ts](types.ts)** - TypeScript type definitions
- **[constants.ts](constants.ts)** - Application constants
- **[GANGS-FEATURE.md](GANGS-FEATURE.md)** - Gang system details
- **[GANG-DRUG-ECONOMY.md](GANG-DRUG-ECONOMY.md)** - Drug economy mechanics

---

**Last Updated**: 2025-10-23  
**Version**: 21.0.0

