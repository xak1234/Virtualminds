# Experimental & Debugging Features - Guide Command Update

## ✅ Added Missing Documentation

I've now included comprehensive coverage of the psychological experimental effects and debugging windows in the `guide` command.

---

## 🆕 New Guide Topics Added

### 1. **`guide experimental`** - 🧪 Experimental Psychology Features

**Covers:**
- **Conversation Psychology**: Turn order modes, interruption systems, topic evolution
- **Social Dynamics**: Relationship tracking, dominance hierarchy, alliance formation  
- **Behavioral Systems**: Mood system, verbosity adaptation, emotional expressiveness
- **Autonomous Communication**: Initiative probability, communication patterns, target selection
- **Advanced Features**: Theory of mind, self-awareness, metacommunication, learning

**Key Features Documented:**
- Turn Order Modes: sequential, random, weighted, interrupt-based
- Relationship Tracking: Affinity (-1.0 to 1.0) and familiarity (0.0 to 1.0)
- Social Energy Model: Personalities get tired from conversation
- Mood System: happy, frustrated, curious, bored affect behavior
- Opinion Shift Rate: How quickly opinions change (0.0-1.0)
- Cross-Conversation Context: Share memory across chats

### 2. **`guide debugging`** - 🔍 Debugging Windows & Monitoring

**Covers:**
- **Admin Debug Window**: System instructions, model calls, TTS events
- **API Debug Monitor**: Real-time API usage, token counts, costs
- **Gang Debug Window**: Gang stats, member status, territory control
- **Game Debug**: Automatic debugging for games
- **Experimental Monitoring**: Relationship matrix, social energy, mood states

**Debug Windows Documented:**
- 🔧 **Admin Debug Window** (`debug` command)
  - Real-time event logging
  - System instruction display
  - Model configuration monitoring
  - Experimental settings overview
  - Personality overrides tracking
  - Social dynamics visualization

- 📊 **API Debug Monitor** (`debug api` command)
  - Live API call tracking
  - Token usage statistics
  - Cost monitoring per provider
  - Request/response logging
  - Performance metrics
  - Error tracking

- 🔒 **Gang Debug Window** (`debug gangs` command)
  - Gang statistics (territory, resources, reputation, violence, loyalty)
  - Member statistics (loyalty, respect, violence, hits)
  - Real-time gang events and consequences
  - Drug economy tracking (if enabled)
  - Weapons inventory and bribe attempts

### 3. **`guide admin`** - 👑 Admin Commands & Advanced Features

**Covers:**
- **Admin Login**: Authentication and user management
- **Debugging Windows**: Access to all monitoring tools
- **System Monitoring**: API usage, error testing, voice debugging
- **AI Control**: Claude AI assistant with full framework control
- **Experimental Access**: Advanced psychology features

**Admin Features Documented:**
- `login admin [password]` - Administrator authentication
- `debug` commands - Access to all debugging windows
- `usage` - API usage statistics and costs
- `claude [message]` - AI assistant with framework control
- `test error/warning/all` - Error system testing
- `voicedebug` - Voice assignment debugging

---

## 🎯 Usage Examples

### Access Experimental Features
```bash
guide experimental
```
Shows all psychological simulation features and how to configure them.

### View Debugging Tools
```bash
guide debugging
```
Comprehensive overview of all monitoring and debugging windows.

### Admin Commands
```bash
guide admin
```
Administrator-level commands and advanced features.

### Quick Access
```bash
gd experimental    # Shortcut for experimental features
gd debugging       # Shortcut for debugging tools
gd admin          # Shortcut for admin commands
```

---

## 🔬 Experimental Psychology Features Now Documented

### **Conversation Flow & Turn-Taking**
- `turnOrderMode`: sequential, random, weighted, interrupt-based
- `allowInterruptions`: Enable personality interruptions
- `interruptionProbability`: 0.0-1.0 chance of interruption
- `dynamicTurnLength`: Variable response lengths
- `silenceTolerance`: Milliseconds before timeout

### **Topic & Context Management**
- `topicDriftAllowance`: 0.0-1.0 how far off-topic allowed
- `enableTopicEvolution`: Natural topic changes
- `multiTopicMode`: Multiple concurrent conversation threads
- `contextWeighting`: Recency, importance, emotional, relevance
- `crossConversationContext`: Share memory across chats
- `forcedTopic`: Lock all conversations to specific topic

### **Autonomous Communication Behavior**
- `defaultInitiativeProbability`: 0.0-1.0 conversation starting chance
- `communicationFrequencyPattern`: constant, bursty, circadian, event-driven
- `enableSocialEnergyModel`: Conversation fatigue system
- `socialEnergyDepletionRate`: How fast energy decreases
- `proactiveVsReactive`: Balance between initiating vs responding
- `targetSelectionMode`: random, affinity-based, topic-interest, needs-based

### **Relationship & Social Dynamics**
- `enableRelationshipTracking`: Affinity and familiarity tracking
- `enableDominanceHierarchy`: Pecking order establishment
- `enableAllianceFormation`: Personality alliances and coordination
- `conflictMode`: avoid, neutral, embrace, escalate

### **Response Characteristics**
- `defaultVerbosity`: 0.5-2.0 response length multiplier
- `verbosityAdaptation`: Match or contrast other speakers
- `emotionalExpressiveness`: 0.0-1.0 emotional intensity
- `thinkingTimeVariance`: Variable response timing
- `enableCertaintyTracking`: Track confidence in responses
- `attentionSpanEnabled`: Personalities lose focus over time
- `diversityBoost`: 0.0-0.5 extra temperature for variety

### **Advanced Features**
- `opinionShiftRate`: 0.0-1.0 how quickly opinions change
- `learningFromInteractions`: Adapt based on past conversations
- `enableMoodSystem`: Emotional states affecting behavior
- `selfAwareness`: 0.0-1.0 personality awareness of own state
- `theoryOfMind`: 0.0-1.0 understanding others' mental states
- `enableMetacommunication`: Communication about communication

---

## 🔍 Debugging Windows Now Documented

### **Admin Debug Window**
- **Access**: `debug` command (admin only)
- **Tabs**: Events, System, Experimental
- **Features**: Real-time logging, system monitoring, experimental settings display
- **Updates**: Every 1-2 seconds

### **API Debug Monitor**
- **Access**: `debug api` command (admin only)
- **Features**: Live API tracking, token usage, cost monitoring
- **Providers**: Google Gemini, OpenAI, Claude, ElevenLabs
- **Metrics**: Request counts, response times, error rates

### **Gang Debug Window**
- **Access**: `debug gangs` command (admin only, gangs enabled)
- **Tabs**: Gangs, Members, Events, Drugs (if enabled), Weapons (if enabled)
- **Features**: Real-time gang statistics, member tracking, event logging
- **Updates**: Every 5 seconds

---

## 📊 Complete Topic List

The guide command now includes **14 comprehensive topics**:

1. `quickstart` - 5-minute setup guide
2. `commands` - Essential CLI commands
3. `api-keys` - API key setup
4. `tts` - Text-to-speech configuration
5. `gangs` - Prison gang system
6. `drugs` - Drug economy mechanics
7. `weapons` - Weapons system
8. `local` - Local AI models
9. `games` - Interactive games
10. **`experimental`** - 🆕 Psychological simulation features
11. **`debugging`** - 🆕 Debugging windows & monitoring
12. **`admin`** - 🆕 Admin commands & advanced features
13. `troubleshooting` - Common issues
14. `docs` - Complete documentation index

---

## 🎯 Benefits

### **For Researchers**
- Complete documentation of psychological simulation features
- Understanding of relationship tracking and social dynamics
- Access to debugging tools for monitoring experiments

### **For Administrators**
- Comprehensive admin command reference
- Debugging window documentation
- System monitoring capabilities

### **For Advanced Users**
- Full experimental features coverage
- Performance monitoring tools
- Advanced configuration options

---

## ✅ Implementation Complete

The guide command now provides comprehensive coverage of:
- ✅ All experimental psychology features
- ✅ All debugging windows and monitoring tools
- ✅ Admin commands and advanced features
- ✅ System monitoring capabilities
- ✅ Performance impact considerations

Users can now access complete documentation for the framework's advanced psychological simulation and debugging capabilities directly from the CLI.

---

**Updated**: 2025-10-23  
**New Topics**: experimental, debugging, admin  
**Total Topics**: 14
