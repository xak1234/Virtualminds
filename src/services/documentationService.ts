/**
 * Documentation Service
 * Provides access to framework documentation through CLI commands
 */

export interface GuideSection {
  title: string;
  content: string;
  subsections?: GuideSection[];
}

export interface DocumentationIndex {
  [key: string]: GuideSection;
}

export class DocumentationService {
  private static instance: DocumentationService;
  
  public static getInstance(): DocumentationService {
    if (!DocumentationService.instance) {
      DocumentationService.instance = new DocumentationService();
    }
    return DocumentationService.instance;
  }

  private documentation: DocumentationIndex = {
    // Quick Start Guide
    'quickstart': {
      title: '🚀 Quick Start Guide',
      content: `
Welcome to the Criminal Minds Framework!

⚠️ UNLIMITED PSYCHOLOGICAL POSSIBILITIES ⚠️
The outcomes of your experiments are ENDLESS and depend entirely on 
the personalities (minds) you import. Every combination creates unique, 
never-before-seen psychological scenarios.

STEP 1: Set up API keys
  • Copy api-keys.example.json to api-keys.json
  • Add your API keys (Google Gemini recommended)
  • See: guide api-keys

STEP 2: Load personalities (THE MINDS)
  • CLI: load tony_blair
  • Or click Personality Panel → Load Personality
  • Load multiple personalities for interactions
  • Each mind brings unique psychology and behaviors

STEP 3: Start chatting
  • Click on loaded personality
  • Type a message and press Enter
  • Watch how their unique psychology emerges

STEP 4: Enable voice (optional)
  • CLI: tts enable
  • Or Settings → TTS → Enable Global TTS

STEP 5: Explore unlimited possibilities
  • Enable experimental features: guide experimental
  • Try gang simulations: guide gangs
  • Experiment with different personality combinations
  • Create scenarios that have never existed before

🌟 REMEMBER: The framework provides the TOOLS and ENVIRONMENT.
YOU provide the MINDS. The psychological outcomes are limited only 
by your imagination and the personalities you choose to import.

🎉 You're ready! Try: guide commands for more help.
      `
    },

    // Commands Reference
    'commands': {
      title: '📋 Essential Commands',
      content: `
PERSONALITY MANAGEMENT:
  load <name>              Load personality
  unload <name>            Unload personality  
  list                     Show loaded personalities
  link <p1> <p2>          Link two personalities
  link all                 Link all personalities

CONVERSATIONS:
  person <name>            Open chat with personality
  auto start <p1> <p2>     Start autonomous conversation
  auto topic "<topic>"     Set conversation topic
  auto pause/resume/stop   Control autonomous chat
  say <message>            Insert message into conversation

TTS & VOICE:
  tts enable/disable       Toggle text-to-speech
  tts provider <provider>  Set TTS provider (browser/elevenlabs/self_hosted)
  sound on/off             Global sound toggle

API & MODELS:
  api provider <provider>  Set AI provider (google/openai/local)
  api model <model>        Set AI model
  api usage                Show token usage stats
  llm <ip:port>            Set LM Studio server URL (saved to profile)
  @ <message>              Send message directly to external LLM

GANGS (Experimental):
  gang status              View gang statistics
  gang assign <name> <id>  Assign member to gang

SYSTEM:
  help                     Show full help
  guide <topic>            Show documentation (this!)
  clear                    Clear chat history
  exit                     Exit CLI or reset app

SHORTCUTS: h=help, p=person, g=guide, ls=list, cv=converse
      `
    },

    // API Keys Setup
    'api-keys': {
      title: '🔑 API Keys Setup',
      content: `
REQUIRED: At least one AI provider API key

STEP 1: Create api-keys.json
  cp api-keys.example.json api-keys.json

STEP 2: Add your keys
  {
    "geminiApiKey": "AIzaSy...",     ← Google Gemini (RECOMMENDED)
    "openaiApiKey": "sk-...",        ← OpenAI GPT
    "elevenlabsApiKey": "...",       ← ElevenLabs TTS (optional)
  }

GETTING API KEYS:
  • Google Gemini: https://ai.google.dev/ (FREE tier available)
  • OpenAI: https://platform.openai.com/api-keys (Pay-as-you-go)
  • ElevenLabs: https://elevenlabs.io/ (For premium TTS)

COSTS (approximate):
  • Gemini: FREE (60 req/min), then $0.000125/1K tokens
  • OpenAI GPT-4: ~$0.03/1K tokens
  • OpenAI GPT-3.5: ~$0.002/1K tokens

SECURITY:
  ✅ api-keys.json is gitignored (never committed)
  ✅ Keys stored locally only
  ⚠️ Never share your api-keys.json file

Test your setup: api provider google
      `
    },

    // TTS Setup
    'tts': {
      title: '🎤 Text-to-Speech Setup',
      content: `
QUICK SETUP (Browser TTS):
  tts provider browser
  tts enable

BEST OPTION (Self-Hosted - FREE):
  1. pip install -r scripts/requirements-tts.txt
  2. python scripts/coqui-xtts-server.py
  3. tts provider self_hosted
  4. Clone voices: curl -X POST "http://localhost:8000/clone?name=tony_blair" -F "audio=@voice.wav"

PREMIUM OPTION (ElevenLabs):
  1. Get API key from https://elevenlabs.io/
  2. Add to api-keys.json: "elevenlabsApiKey": "your-key"
  3. tts provider elevenlabs

TTS PROVIDERS COMPARISON:
  Browser:     FREE, basic quality, instant setup
  Self-Hosted: FREE, excellent quality, 10min setup, voice cloning
  ElevenLabs:  $22-330/month, premium quality, instant setup
  OpenAI TTS:  $15/million chars, very good quality

VOICE CLONING (Self-Hosted):
  • Need 10-30 second audio samples (WAV format)
  • Clear voice, minimal background noise
  • One speaker only
  • Saves $300-500/month vs ElevenLabs!

Commands: tts enable, tts provider <name>, sound on/off
      `
    },

    // Gang System
    'gangs': {
      title: '🔒 Prison Gangs System',
      content: `
EXPERIMENTAL PSYCHOLOGY SIMULATION

QUICK ENABLE:
  1. Settings → Experimental → Enable Prison Gangs
  2. Configure 2-6 gangs with names and colors
  3. Assign personalities as leaders and members
  4. Set environment intensity (0.0-1.0)

GANG FEATURES:
  • Territory control and wars
  • Violence and solitary confinement  
  • Loyalty and respect systems
  • Drug economy (smuggling, dealing, items)
  • Weapons system (guns, shanks, chains)
  • Guard bribery and corruption

GANG MECHANICS:
  • Hierarchies: Leader 👑, Lieutenant ⭐, Soldier, Recruit
  • Statistics: Territory, Resources, Reputation, Violence, Loyalty
  • Events: Violence, recruitment, drug deals, weapon theft
  • Consequences: Solitary confinement, death (if enabled)

DRUG ECONOMY:
  • Smuggle drugs (10-50g, 15% detection risk)
  • Deal drugs ($20-50/gram, 7.5% detection risk)  
  • Buy items: prostitutes ($500), beer ($200), cigarettes ($100)
  • Steal from rival gangs (70% detection risk)

WEAPONS SYSTEM:
  • Bribe guards for weapons ($500-1000)
  • Craft improvised weapons (shanks, chains)
  • Steal weapons after violence
  • Detection by guards (weapon concealment matters)

Commands: gang status, gang assign <name> <gangId>
See: guide drugs, guide weapons
      `
    },

    // Drug Economy
    'drugs': {
      title: '💊 Drug Economy System',
      content: `
PRISON DRUG TRADE SIMULATION WITH BEHAVIORAL IMPACT

ENABLE:
  1. Enable Prison Gangs first
  2. Settings → Experimental → Prison Gangs → Drug Economy
  3. Set frequencies (0.0-1.0)

🧠 BEHAVIORAL CHANGES & AI IMPACT:
  Drug activities fundamentally change personality behavior:
  • High earners become more confident and aggressive in conversations
  • Gang members reference drug operations naturally in speech
  • Successful dealers gain respect and speak with authority
  • Caught members become paranoid and cautious
  • Gang leaders coordinate drug operations in conversations

ACTIVITIES & BEHAVIORAL EFFECTS:

  🚚 SMUGGLING (every 5s, frequency-based)
    • Bring 10-50g drugs into prison
    • Base detection: 15% + guard alertness (0-30%)
    • Experience reduces risk up to -10% (veteran smugglers)
    
    SUCCESS EFFECTS:
    • +drugs to inventory and gang stash
    • +2 gang reputation, +5 personal respect
    • AI becomes more confident, references smuggling success
    • Large smuggles (43g+) earn special recognition and medals
    
    CAUGHT EFFECTS:
    • Solitary confinement (1min), sentence extension
    • -10 gang reputation, paranoid behavior in AI
    • AI becomes cautious, references prison dangers

  💰 DEALING (every 5s, if carrying drugs)  
    • Sell 5-25g at $20-50/gram (market fluctuates)
    • Lower detection: 7.5% + guard alertness (0-20%)
    • Average earnings: $300-500 per successful deal
    
    SUCCESS EFFECTS:
    • Gang earns money, +1 reputation, +3 personal respect
    • AI speaks with business confidence, references wealth
    • Successful dealers coordinate with gang members
    • Achievement system unlocks trophies and medals
    
    CAUGHT EFFECTS:
    • Lose drugs, 30% chance solitary (45s)
    • AI becomes defensive, avoids drug topics

🏆 ACHIEVEMENT & SCORING SYSTEM:
  
  DRUG TROPHIES (based on total earnings):
  • 🏅 Drug Medal: $3,500+ earnings
  • 🏆 Bronze Trophy: $5,000+ earnings  
  • 🥈 Silver Trophy: $10,000+ earnings
  • 🥇 Gold Trophy: $20,000+ earnings
  • 💎 Platinum Medal: $50,000+ earnings
  
  SPECIAL ACHIEVEMENTS:
  • Major Smuggle Medal: Single 43g+ smuggle
  • Veteran Smuggler: Multiple successful operations
  • Drug Lord Status: Highest earner in gang
  
  LEADERSHIP SCORING (affects gang hierarchy):
  • Respect × 2 points
  • Loyalty points  
  • Rival kills × 50 points
  • Drugs dealt × 0.01 points per gram
  • Drugs smuggled × 0.02 points per gram
  • Successful bribes × 20 points
  • Weapons stolen × 15 points

🤝 GROUP DYNAMICS & SOCIAL EFFECTS:

  GANG COORDINATION:
  • Leaders coordinate drug operations in conversations
  • Members report earnings and request supplies
  • Successful dealers gain influence within gang
  • Poor performers lose respect and may be demoted
  
  INTER-GANG RELATIONS:
  • Rich gangs become targets for theft
  • Economic disparity fuels violence
  • Successful drug gangs attract recruitment
  • Poor gangs take desperate risks
  
  BEHAVIORAL HIERARCHY:
  • High earners speak with authority
  • New recruits defer to successful dealers
  • Gang leaders reference drug profits in power plays
  • Rival gangs show jealousy toward successful operations

  🛒 ITEMS & LOYALTY SYSTEM (buy with drug money)
    • Prostitute Visit: $500 (+20 loyalty, +10 respect)
    • Beer Case: $200 (+15 loyalty, +5 respect, morale boost)  
    • Cigarettes: $100 (+10 loyalty, trade currency)
    • Phone Time: $150 (+8 loyalty, communication benefit)
    • Luxury Food: $80 (+5 loyalty, health boost)
    
    ITEM EFFECTS ON BEHAVIOR:
    • Gang members reference luxury items in conversation
    • Items boost morale and gang cohesion
    • Leaders use items to reward loyal members
    • Items become status symbols affecting AI personality

  🎯 THEFT & VIOLENCE (steal from rival gangs)
    • 70% chance of detection → triggers violence
    • Success: steal item + 10 respect + bragging rights
    • AI references successful thefts as power moves
    • Failed theft leads to gang wars and retaliation

STATISTICS TRACKED & AI INTEGRATION:
  
  GANG-LEVEL (affects group behavior):
  • Current money (influences confidence)
  • Total lifetime earnings (determines status)
  • Drug stash size (affects operations)
  • Items owned (status symbols)
  
  MEMBER-LEVEL (affects individual AI behavior):
  • Drugs currently carrying (paranoia if high)
  • Total drugs dealt (experience and confidence)
  • Total drugs smuggled (veteran status)
  • Times caught (paranoid behavior)
  • Total earnings (wealth affects personality)
  • Achievement trophies (bragging rights)
  • Sentence extensions (bitterness toward system)

CONVERSATION INTEGRATION:
  AI personalities naturally reference:
  • Recent drug deals and profits
  • Gang's financial status and operations
  • Rivalry over drug territory
  • Paranoia about guards and detection
  • Bragging about successful operations
  • Coordinating future drug activities
  • Status symbols and luxury items

VIEW STATS: Gang Debug Window → Gangs/Members tabs
MONITOR BEHAVIOR: Admin Debug Window shows AI context changes
      `
    },

    // Weapons System  
    'weapons': {
      title: '🔫 Weapons System',
      content: `
PRISON WEAPONS & GUARD BRIBERY

ENABLE:
  1. Enable Prison Gangs first
  2. Settings → Experimental → Prison Gangs → Weapons System

WEAPON TYPES:
  🔫 GUN: 80-100 damage, low concealment (0.2), bribe guard ($500-1000)
  🔪 SHANK: 40-60 damage, high concealment (0.8), craft from materials  
  ⛓️ CHAIN: 30-50 damage, medium concealment (0.5), steal from storage

ACQUISITION METHODS:
  💰 GUARD BRIBERY
    • Cost: $500-1000 / guard corruptibility
    • Success: corruptibility - (alertness × 0.5)
    • Guards: Honest (10%), Neutral (40%), Corrupt (80%), Dangerous (??%)
    • Failure: lose money, possible solitary + reputation loss

  🔨 WEAPON CRAFTING  
    • Automatic for gang members
    • 70% success rate for shanks/chains
    • Cannot craft guns

  🎯 WEAPON THEFT
    • After winning violence event
    • 40% chance to steal victim's weapon
    • Victim weapon durability decreases

USAGE IN VIOLENCE:
  Base damage: 10-30
  With weapon: +weapon damage
  Weapons degrade with use (durability system)

DETECTION BY GUARDS:
  Detection = Guard Alertness × (1 - Weapon Concealment)
  Example: 70% alert guard vs 80% concealment shank = 14% detection
  If detected: weapon confiscated, solitary (1-2min), reputation -15

Commands: bribe <name> <weapon>, craft <name> <weapon>, steal <thief> <victim>
      `
    },

    // Local Models
    'local': {
      title: '🖥️ Local AI Models (Offline)',
      content: `
RUN AI COMPLETELY OFFLINE

OPTION 1: llama.cpp Server (Recommended)
  1. Download llama.cpp: https://github.com/ggerganov/llama.cpp/releases
  2. Get GGUF model (4-20GB): https://huggingface.co/models?library=gguf
  3. Start server: ./server -m model.gguf --port 8080
  4. Configure app:
     • Create .env.local: VITE_USE_LLAMA_SERVER=true
     • CLI: api provider local
  5. Chat offline!

OPTION 2: WebLLM (Browser-based)
  1. CLI: api provider local  
  2. Choose model: TinyLlama-1.1B (~700MB) or Qwen2.5-0.5B (~400MB)
  3. Wait for download (first time only)
  4. Models cached for future use

RECOMMENDED MODELS:
  • TinyLlama 1.1B: Fast, good quality, 700MB
  • Llama 2 7B Chat: High quality, 4GB
  • Mistral 7B Instruct: Excellent quality, 4GB
  • Phi-2: Good balance, 1.6GB

BENEFITS:
  ✅ Completely free (no API costs)
  ✅ No internet required (after download)
  ✅ Complete privacy (no data sent anywhere)
  ✅ Unlimited usage

REQUIREMENTS:
  • 8-16GB RAM (for 7B models)
  • 4-20GB storage per model
  • GPU optional (faster with CUDA)

Commands: local list, local load <model>, api provider local
      `
    },

    // External LLM Server
    'llm': {
      title: '🤖 External LLM Server (LM Studio)',
      content: `
CONNECT TO EXTERNAL LLM SERVERS

SETUP LM STUDIO:
  1. Download and install LM Studio
  2. Load a model (e.g., Llama 2, Mistral, CodeLlama)
  3. Start local server in LM Studio
  4. Configure framework connection

CONFIGURE CONNECTION:
  llm <ip:port>            Set server URL (saved to your profile)
  llm                      Show current server URL
  
EXAMPLES:
  llm localhost:1234       Connect to local LM Studio
  llm 192.168.0.15:1234    Connect to remote LM Studio
  llm 10.0.0.100:8080      Connect to custom server

DIRECT COMMUNICATION:
  @ <message>              Send message directly to LLM server
  @                        Toggle LLM conversation mode
  
EXAMPLES:
  @ What is machine learning?
  @ Write a Python function to sort a list
  @ Explain quantum computing simply

FEATURES:
  ✅ Blue styling for LLM communications
  ✅ Automatic model detection and selection
  ✅ Connection error handling ("LLM unavailable")
  ✅ URL settings saved to user profile
  ✅ Bypasses personality system for direct AI access

TROUBLESHOOTING:
  • "LLM unavailable" → Check server is running
  • Check firewall settings for remote connections
  • Verify correct IP:port with 'llm' command
  • Ensure LM Studio has a model loaded

SUPPORTED SERVERS:
  • LM Studio (recommended)
  • llama.cpp server
  • Any OpenAI-compatible API server
      `
    },

    // Games
    'games': {
      title: '🎮 Interactive Games',
      content: `
PLAY GAMES WITH AI PERSONALITIES

♟️ CHESS
  • Command: chess <personality>
  • Play chess against any loaded personality
  • Full rule validation, move history
  • AI provides commentary during game
  • Save/load games

🎭 CELEBRITY GUESS  
  • Command: game2 (requires 3+ personalities)
  • One AI pretends to be a celebrity
  • Others ask yes/no questions to guess
  • 20 questions limit
  • Adaptive questioning, learning system

🕵️ HIDDEN IDENTITIES
  • Command: game (requires 10+ personalities)  
  • Secret role assignment game
  • Teams compete to identify roles
  • Social deduction mechanics
  • Vote to reveal identities

GAME FEATURES:
  • AI personalities adapt to game context
  • Scoring and statistics tracking
  • Multiple difficulty levels
  • Save/resume functionality

TIPS:
  • Load diverse personalities for better gameplay
  • Enable TTS for immersive experience
  • Use relationship tracking for richer interactions

Commands: chess <name>, game, game2
      `
    },

    // Troubleshooting
    'troubleshooting': {
      title: '🔧 Troubleshooting',
      content: `
COMMON ISSUES & SOLUTIONS

❌ "API Key Invalid"
  • Check api-keys.json format (valid JSON)
  • Verify keys are correct (no extra spaces)
  • Test: api provider google
  • Get new key if expired

❌ "No Personalities Loaded"  
  • Check public/personalities/ folder exists
  • Verify ZIP files are valid
  • CLI: personality reload
  • Try different personality

❌ TTS Not Working
  • CLI: tts enable
  • Check provider: tts provider browser
  • Test: tts test "hello world"
  • Verify browser audio not muted

❌ Self-Hosted TTS Server Issues
  • Check server running: curl http://localhost:8000/health
  • Restart: python scripts/coqui-xtts-server.py
  • Verify URL: http://localhost:8000 (no trailing slash)
  • Check firewall not blocking port 8000

❌ Local Models Not Working
  • Ensure llama.cpp server running
  • Check .env.local: VITE_USE_LLAMA_SERVER=true
  • Restart dev server after .env changes
  • Test: local test

❌ Gangs Not Showing
  • Settings → Experimental → Enable Prison Gangs
  • Configure at least 2 gangs
  • Assign personalities to gangs
  • Refresh page

❌ Slow Performance
  • Unload unused personalities (max 4 recommended)
  • Use faster models (gemini-1.5-flash)
  • Disable StarField: Settings → Appearance
  • Reduce gang update frequency

❌ Conversations Stuck
  • CLI: auto skip (skip current speaker)
  • CLI: auto stop, then auto start <p1> <p2>
  • Check API provider responding
  • Clear history: clear

For more help: guide docs
      `
    },

    // Experimental Psychology Features
    'experimental': {
      title: '🧪 Experimental Psychology Features',
      content: `
ADVANCED PSYCHOLOGICAL SIMULATION FEATURES

⚠️ CRITICAL UNDERSTANDING: THE POSSIBILITIES ARE UNLIMITED ⚠️

The psychological outcomes, behaviors, and dynamics are ENDLESS and UNLIMITED 
depending on the imported personalities (minds) you load into the system.

Each personality brings their own:
• Unique psychological profile and mental patterns
• Historical context and life experiences  
• Behavioral tendencies and response patterns
• Social dynamics and relationship styles
• Moral frameworks and decision-making processes
• Emotional ranges and expression styles
• Communication patterns and linguistic preferences

When these diverse minds interact through the experimental features below,
the emergent behaviors, conversations, and social dynamics become 
INFINITELY COMPLEX and UNPREDICTABLE.

🌟 UNLIMITED PSYCHOLOGICAL POSSIBILITIES:

The framework provides the TOOLS and ENVIRONMENT, but the actual psychological
outcomes depend entirely on WHICH MINDS you import:

• Load historical figures → Study period-specific social dynamics
• Load fictional characters → Explore narrative psychology  
• Load controversial figures → Examine conflict and moral reasoning
• Load diverse personalities → Create unprecedented social experiments
• Load similar minds → Study group conformity vs individual expression
• Load opposing viewpoints → Generate complex philosophical debates

EVERY COMBINATION CREATES UNIQUE, NEVER-BEFORE-SEEN PSYCHOLOGICAL SCENARIOS.

ENABLE EXPERIMENTAL FEATURES:
  Settings → Experimental tab → Configure options

🧠 CONVERSATION PSYCHOLOGY (Framework Tools):
  • Turn Order Modes: sequential, random, weighted, interrupt-based
  • Interruption System: Allow personalities to interrupt each other
  • Topic Evolution: Natural topic drift and evolution
  • Context Weighting: Recency, importance, emotional, relevance
  • Cross-Conversation Context: Share memory across chats

🤝 SOCIAL DYNAMICS (Emergent Behaviors):
  • Relationship Tracking: Affinity (-1.0 to 1.0) and familiarity (0.0 to 1.0)
  • Dominance Hierarchy: Establish pecking order among personalities
  • Alliance Formation: Personalities form alliances and coordinate
  • Conflict Modes: avoid, neutral, embrace, escalate
  • Social Energy Model: Personalities get tired from conversation

💭 BEHAVIORAL SYSTEMS (Individual Expression):
  • Mood System: happy, frustrated, curious, bored affect behavior
  • Verbosity Adaptation: Match or contrast other speakers
  • Emotional Expressiveness: Control emotional intensity (0.0-1.0)
  • Attention Span: Personalities lose focus over time
  • Opinion Shift Rate: How quickly opinions change (0.0-1.0)

🎯 AUTONOMOUS COMMUNICATION (Spontaneous Interaction):
  • Initiative Probability: How often personalities start conversations
  • Communication Patterns: constant, bursty, circadian, event-driven
  • Target Selection: random, affinity-based, topic-interest, needs-based
  • Proactive vs Reactive: Balance between initiating vs responding

🔬 ADVANCED FEATURES (Cognitive Simulation):
  • Theory of Mind: Understanding others' mental states
  • Self-Awareness: Personality awareness of their own state
  • Metacommunication: Communication about communication
  • Learning from Interactions: Adapt based on past conversations
  • Certainty Tracking: Track confidence in responses

🌍 INFINITE EXPERIMENTAL SCENARIOS:

The framework enables unlimited psychological research:

HISTORICAL EXPERIMENTS:
• What if Einstein debated with Aristotle?
• How would Napoleon interact with modern politicians?
• Could Gandhi influence Hitler's thinking?

SOCIAL PSYCHOLOGY:
• Group conformity vs individual rebellion
• Leadership emergence in diverse groups
• Conflict resolution between opposing ideologies
• Alliance formation across cultural boundaries

BEHAVIORAL STUDIES:
• Personality adaptation in extreme environments (prison simulation)
• Economic decision-making under pressure (drug economy)
• Violence escalation and de-escalation patterns
• Loyalty vs self-preservation in crisis situations

COGNITIVE RESEARCH:
• Opinion formation and change mechanisms
• Memory sharing and collective intelligence
• Emotional contagion and mood synchronization
• Communication pattern evolution over time

PHILOSOPHICAL EXPLORATION:
• Free will vs determinism in AI personalities
• Consciousness emergence in group dynamics
• Moral reasoning development through interaction
• Identity persistence through environmental changes

🎛️ CONFIGURATION & CUSTOMIZATION:

Each feature has detailed sliders and options in Settings → Experimental
Per-personality overrides available for fine-tuning individual behavior

The system provides the FRAMEWORK - YOU provide the MINDS.
The psychological outcomes are limited only by your imagination
and the personalities you choose to import.

REMEMBER: Every personality combination creates a unique psychological 
experiment that has never existed before in human history.

See: guide debugging for monitoring tools
See: guide gangs for environmental psychology
See: guide drugs for economic behavioral psychology
      `
    },

    // Admin Commands & Advanced Features
    'admin': {
      title: '👑 Admin Commands & Advanced Features',
      content: `
ADMINISTRATOR-LEVEL COMMANDS & FEATURES

🔐 ADMIN LOGIN:
  login admin [password]       - Login as administrator
  whoami                       - Check current user status
  logout                       - Logout from admin

🔧 DEBUGGING WINDOWS:
  debug on/off/toggle/clear    - Admin Debug Window (system monitoring)
  debug api                    - API Debug Monitor (usage tracking)
  debug gangs                  - Gang Debug Window (gang monitoring)

📊 SYSTEM MONITORING:
  usage                        - API usage statistics and costs
  test error/warning/all       - Test error/warning systems
  voicedebug                   - Debug voice assignments

🤖 AI CONTROL:
  claude [message]             - Chat with Claude AI with full framework control
                                Claude can manipulate personalities and settings live
  
🔬 EXPERIMENTAL ACCESS:
  Admin users have access to all experimental psychology features
  Can monitor relationship matrices, social dynamics, mood systems

ADMIN-ONLY FEATURES:
  • Full debugging window access
  • API usage and cost tracking  
  • System performance monitoring
  • Claude AI assistant integration
  • Advanced experimental settings
  • Error and warning system testing

SECURITY:
  Admin features are protected and require proper authentication
  Regular users cannot access debugging or monitoring tools
      `
    },

    // Debugging Windows & Monitoring
    'debugging': {
      title: '🔍 Debugging Windows & Monitoring',
      content: `
COMPREHENSIVE DEBUGGING & MONITORING TOOLS

🔧 ADMIN DEBUG WINDOW:
  Command: debug (requires admin login)
  Shows: System instructions, model calls, TTS events, experimental settings
  
  FEATURES:
  • Real-time event logging
  • System instruction display
  • Model configuration monitoring
  • Experimental settings overview
  • Personality overrides tracking
  • Social dynamics visualization

📊 API DEBUG MONITOR:
  Command: debug api (requires admin login)
  Shows: Real-time API usage, token counts, costs, request logs
  
  FEATURES:
  • Live API call tracking
  • Token usage statistics
  • Cost monitoring per provider
  • Request/response logging
  • Performance metrics
  • Error tracking

🔒 GANG DEBUG WINDOW:
  Command: debug gangs (requires admin + gangs enabled)
  Shows: Gang stats, member status, territory control, events
  
  TABS:
  • Gangs: Territory, resources, reputation, violence, loyalty
  • Members: Individual stats, loyalty, respect, violence, hits
  • Events: Real-time gang activities and consequences
  • Drugs: Smuggling, dealing, money, items (if drug economy enabled)
  • Weapons: Weapon inventory, bribe attempts, theft events

🎮 GAME DEBUG:
  Automatic debugging for games (chess, celebrity guess, hidden identities)
  Shows game state, AI decision making, scoring

🧪 EXPERIMENTAL MONITORING:
  Admin Debug Window → Experimental tab shows:
  • Relationship matrix (affinity/familiarity between personalities)
  • Social energy levels
  • Mood states
  • Conversation patterns
  • Turn order statistics
  • Autonomous communication metrics

CLI DEBUGGING COMMANDS:
  debug on/off/toggle/clear    - Admin debug window
  debug api                    - API monitoring window  
  debug gangs                  - Gang monitoring window
  test error/warning/all       - Test error systems
  voicedebug                   - Voice assignment debugging

MONITORING FEATURES:
  • Real-time updates (1-5 second intervals)
  • Event filtering and search
  • Export logs and statistics
  • Clear logs and reset counters
  • Performance impact monitoring

ADMIN ACCESS:
  Most debugging features require admin login:
  login admin [password]

PERFORMANCE IMPACT:
  Debugging windows update frequently - may impact performance with many personalities
  Disable when not needed for optimal performance

See: guide admin for admin commands
      `
    },

    // Documentation Index
    'docs': {
      title: '📚 Complete Documentation',
      content: `
FULL DOCUMENTATION REFERENCE

📖 MAIN GUIDES:
  • USER-GUIDE.md - Complete comprehensive guide (⭐ START HERE)
  • QUICK-REFERENCE.md - Command cheat sheet  
  • FAQ.md - Frequently asked questions
  • ARCHITECTURE.md - System architecture
  • DEVELOPER-GUIDE.md - Extend with custom environments

🔧 SETUP GUIDES:
  • API-KEYS-SETUP.md - API key configuration
  • SELF-HOSTED-TTS-QUICKSTART.md - Free voice cloning (10min)
  • USING-LOCAL-MODELS.md - Offline AI models
  • VOICE-SETUP-GUIDE.md - Voice configuration

🔒 GANG SYSTEM:
  • GANGS-FEATURE.md - Prison gang simulation
  • GANG-DRUG-ECONOMY.md - Drug economy mechanics  
  • GANGS-WEAPONS-SYSTEM.md - Weapons & bribery
  • GANGS-TROUBLESHOOTING.md - Fix gang issues

🧪 EXPERIMENTAL FEATURES:
  • Psychological simulation features
  • Debugging windows and monitoring
  • Advanced AI behavior systems

☁️ DEPLOYMENT:
  • runpod-setup.md - Deploy to RunPod (GPU cloud)
  • WARP.md - Alternative deployment options

🧑‍💻 FOR DEVELOPERS:
  • DEVELOPER-GUIDE.md - Add custom environments
  • ARCHITECTURE.md - System design
  • types.ts - TypeScript definitions

READING PATHS:
  Beginner: README → API-KEYS-SETUP → USER-GUIDE
  Advanced: + GANGS-FEATURE → SELF-HOSTED-TTS-QUICKSTART  
  Developer: + ARCHITECTURE → DEVELOPER-GUIDE
  Researcher: + experimental → debugging

ACCESS ONLINE:
  All documentation available in project files
  GitHub: [repository-url]
  
CLI GUIDES: guide <topic>
Available topics: quickstart, commands, api-keys, tts, gangs, drugs, weapons, local, llm, games, experimental, debugging, admin, troubleshooting, docs

⚠️ CRITICAL: The psychological outcomes are UNLIMITED and depend entirely on 
the imported personalities (minds) you load. Every combination creates unique 
psychological experiments that have never existed before in human history.
      `
    }
  };

  /**
   * Get available guide topics
   */
  public getAvailableTopics(): string[] {
    return Object.keys(this.documentation);
  }

  /**
   * Get guide content for a specific topic
   */
  public getGuide(topic: string): string {
    const guide = this.documentation[topic.toLowerCase()];
    if (!guide) {
      return this.getTopicNotFoundMessage(topic);
    }

    return `${guide.title}\n${'='.repeat(guide.title.length)}\n${guide.content.trim()}`;
  }

  /**
   * Get guide index (list of all topics)
   */
  public getGuideIndex(): string {
    const topics = this.getAvailableTopics();
    let index = `📚 Documentation Guide - Available Topics\n`;
    index += `${'='.repeat(45)}\n\n`;
    
    index += `Usage: guide <topic>\n\n`;
    
    index += `AVAILABLE TOPICS:\n`;
    topics.forEach(topic => {
      const guide = this.documentation[topic];
      index += `  ${topic.padEnd(15)} - ${guide.title}\n`;
    });
    
    index += `\nEXAMPLES:\n`;
    index += `  guide quickstart    - Get started in 5 minutes\n`;
    index += `  guide commands      - Essential CLI commands\n`;
    index += `  guide api-keys      - Set up API keys\n`;
    index += `  guide gangs         - Prison gang simulation\n`;
    index += `  guide tts           - Text-to-speech setup\n`;
    index += `  guide docs          - Complete documentation index\n`;
    
    index += `\nFULL DOCUMENTATION:\n`;
    index += `  All guides available as .md files in project root\n`;
    index += `  Main guide: USER-GUIDE.md (comprehensive)\n`;
    index += `  Quick ref: QUICK-REFERENCE.md\n`;

    return index;
  }

  /**
   * Search for topics matching a query
   */
  public searchTopics(query: string): string[] {
    const searchTerm = query.toLowerCase();
    return this.getAvailableTopics().filter(topic => 
      topic.includes(searchTerm) || 
      this.documentation[topic].title.toLowerCase().includes(searchTerm) ||
      this.documentation[topic].content.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get topic not found message with suggestions
   */
  private getTopicNotFoundMessage(topic: string): string {
    const suggestions = this.searchTopics(topic);
    let message = `❌ Guide topic '${topic}' not found.\n\n`;
    
    if (suggestions.length > 0) {
      message += `Did you mean:\n`;
      suggestions.slice(0, 5).forEach(suggestion => {
        message += `  guide ${suggestion}\n`;
      });
      message += `\n`;
    }
    
    message += `Available topics: ${this.getAvailableTopics().join(', ')}\n`;
    message += `\nFor complete list: guide\n`;
    message += `For full documentation: guide docs`;
    
    return message;
  }

  /**
   * Format guide content for CLI display
   */
  public formatForCli(content: string): string {
    // Add some basic formatting for CLI display
    return content
      .replace(/^(#{1,3})\s+(.+)$/gm, '$2') // Remove markdown headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markdown
      .replace(/`(.+?)`/g, '$1') // Remove code backticks
      .replace(/^\s*[-•]\s+/gm, '  • ') // Normalize bullet points
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();
  }
}

export const documentationService = DocumentationService.getInstance();
