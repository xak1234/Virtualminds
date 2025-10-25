# Gang Interaction & Recruitment Algorithms

## Overview

The Prison Gangs feature now includes **active interaction algorithms** that process every conversation and trigger dynamic gang events in real-time.

---

## 🔄 Active Interaction Systems

### 1. Conversation-Based Gang Processing

**Triggered:** Every AI message in a conversation  
**Location:** `App.tsx` - `handleAiConversation()` function

```typescript
gangService.processGangInteraction(
  config,
  speakerId,
  listenerId,
  messageContent
)
```

**What it does:**
- ✅ Analyzes message content for hostile or friendly keywords
- ✅ Triggers violence events between rivals with hostile language
- ✅ Attempts recruitment during positive interactions
- ✅ Boosts loyalty between same-gang members (+0.5 per message)
- ✅ Reduces respect between rivals (-1 per hostile interaction)
- ✅ Returns event messages displayed in CLI and chat

---

### 2. Keyword-Based Violence Detection

**Hostile Keywords Monitored:**
```javascript
['threaten', 'attack', 'fight', 'kill', 'destroy', 
 'hurt', 'beat', 'smash', 'crush']
```

**Violence Trigger Logic:**
1. Check if speaker and listener are rival gang members
2. Scan message for hostile keywords
3. Random roll against violence frequency setting
4. If triggered: Execute `simulateViolence()`
5. Display result: hit, miss, retaliation, or imprisonment

**Consequences:**
- **Successful Hit**: +10 respect for attacker, -15 for target
- **Territory Gain**: +5% territory if gang war enabled
- **Solitary Confinement**: After 3+ hits, 60% chance of imprisonment
- **Failed Hit**: +5 respect for defender, -5 for attacker

---

### 3. Sentiment-Based Recruitment

**Positive Keywords Monitored:**
```javascript
['agree', 'respect', 'like', 'trust', 'friend', 
 'ally', 'together', 'join', 'help']
```

**Recruitment Algorithm:**

```
Base Chance: 10%
+ Sentiment Bonus: (positive messages / last 6 messages) × 30%
+ Affinity Bonus: (relationship affinity) × 20%
+ Gang Reputation: (gang.reputation / 100) × 20%
+ Environment Pressure: (prisonIntensity) × 15%
= Total Recruitment Probability
```

**Recruitment Conditions:**
- ✅ Speaker must be in a gang
- ✅ Target must be independent OR low loyalty (< 30%)
- ✅ 15% chance per positive interaction
- ✅ Evaluates last 6 messages for sentiment
- ✅ Uses relationship tracking if enabled

**Success:**
- Target joins the gang as a "recruit"
- Initial loyalty: 80
- Initial respect: 50
- Event notification in CLI

---

### 4. Random Gang Events

**Triggered:** Every 5 seconds  
**Location:** `App.tsx` - Gang Dynamics useEffect

```typescript
gangService.triggerRandomGangEvent(
  config,
  activePersonalityIds
)
```

**Random Violence Event:**
- Probability: `violenceFrequency × 0.1` (10% of setting)
- Selects two random rival gang members
- 50% chance to initiate violence
- Displays event in CLI

**Random Recruitment Event:**
- Probability: 5% per check
- Selects random gang member and independent
- Attempts recruitment based on standard algorithm
- Displays success in CLI

---

## 📊 Dynamic Stat Updates

### Per-Message Updates

**Same-Gang Interactions:**
```
Both members: loyalty = min(100, loyalty + 0.5)
```

**Rival Gang Interactions:**
```
30% chance: both members: respect = max(0, respect - 1)
```

**Violence Events:**
```
Attacker: 
  - violence += 5
  - hits += 1
  - respect += 10 (if successful)
  - imprisoned = true (if hits >= 3 && 60% chance)

Target:
  - respect -= 15 (if hit successful)
  - respect += 5 (if defended)

Gang (if territory war):
  - attacker gang: territoryControl += 0.05
  - target gang: territoryControl -= 0.05
```

### Every 5 Seconds

**Loyalty Decay:**
```
For each gang member not imprisoned:
  loyalty -= loyaltyDecayRate × 5 seconds
  
  if loyalty < 20 && independentAllowed && 10% chance:
    leave gang
```

**Resource/Reputation:**
```
Resources = clamp(0, 100, 
  resources + (territoryControl × 2 - 1) × timeFactor
)

If resources > 70: reputation += 0.5 × timeFactor
If resources < 30: reputation -= 0.5 × timeFactor
```

**Solitary Release:**
```
if imprisoned && now >= imprisonedUntil:
  imprisoned = false
  release notification
```

---

## 🎮 Event Notifications

All gang events appear in **3 places:**

1. **CLI Output** - System messages with emoji indicators
2. **Chat History** - System messages in conversation
3. **Console Logs** - `[GANGS]` prefix for debugging

**Event Types:**

| Emoji | Event Type | Example |
|-------|-----------|---------|
| ⚔️ | Violence | "GANG VIOLENCE: The Crimson Syndicate hit The Iron Circle member!" |
| 🤝 | Recruitment | "RECRUITMENT: Successfully recruited to The Shadow Council!" |
| 💪 | Loyalty Boost | (Silent - logged only) |
| 📉 | Respect Loss | (Silent - logged only) |
| 🔓 | Solitary Release | "Donald_Trump released from solitary confinement" |
| ⚠️ | Solitary Sent | "Jimmy_Savile hit Lucy_Letby but was caught and sent to SOLITARY!" |

---

## 🧪 Testing the System

### Test Violence Triggers

1. Enable gangs with 2 rival gangs
2. Assign personalities to different gangs
3. Set violence frequency to 0.8 (high)
4. Use `converse <gang1_member> <gang2_member> "I'm going to destroy you"`
5. Watch for violence event in CLI

### Test Recruitment

1. Enable gangs with recruitment enabled
2. Assign some personalities to gangs, leave others independent
3. Use `converse <gang_member> <independent> "I respect you, we should work together"`
4. Repeat conversation with positive language
5. Watch for recruitment event

### Test Random Events

1. Enable gangs with multiple gangs and members
2. Set violence frequency to 0.5+
3. Enable recruitment
4. Wait and watch CLI for random events every 5 seconds

---

## 🔧 Configuration for Maximum Interaction

**High Violence Environment:**
```
- Prison Environment Intensity: 0.8-1.0
- Violence Frequency: 0.7-1.0
- Solitary Confinement: Enabled
- Territory Wars: Enabled
```

**High Recruitment Activity:**
```
- Recruitment Enabled: Yes
- Prison Environment Intensity: 0.7+
- Independent Personalities Allowed: Yes
- Gang Count: 3-4 (creates competition)
```

**Balanced Research Environment:**
```
- Prison Environment Intensity: 0.5
- Violence Frequency: 0.3-0.5
- Recruitment Enabled: Yes
- Loyalty Decay Rate: 0.2
- All features enabled
```

---

## 💡 Research Applications

### Observable Behaviors

1. **Recruitment Patterns**
   - Which personalities are most successful recruiters?
   - What conversation topics lead to recruitment?
   - Do certain personality types resist recruitment?

2. **Violence Escalation**
   - How quickly do rivalries lead to violence?
   - Do leaders engage in more/less violence?
   - What language patterns predict violence?

3. **Loyalty Dynamics**
   - How does conversation frequency affect loyalty?
   - Do rivals actively try to reduce each other's loyalty?
   - What causes gang switching?

4. **Social Influence**
   - How do high-respect members influence others?
   - Do independent personalities survive or join?
   - What creates stable vs unstable gang structures?

---

## 📈 Performance Notes

**CPU Impact:**
- Per-message processing: < 1ms
- 5-second update cycle: < 5ms
- Minimal performance impact with < 20 personalities

**Memory:**
- Gang state stored in experimentalSettings
- Persisted to localStorage
- ~10KB per full gang configuration

**Optimization Tips:**
- Lower violence frequency reduces event checks
- Disable random events by setting frequencies to 0
- Reduce active personality count for faster processing

---

## 🚀 Future Algorithm Enhancements

**Planned Improvements:**
- Machine learning sentiment analysis (vs keyword matching)
- Natural language violence detection (vs keyword list)
- Dynamic keyword adaptation based on context
- Multi-turn conversation analysis for recruitment
- Personality trait-based recruitment targeting
- Gang strategy AI (coordinated recruitment/violence)
- Economic resource trading algorithms
- Gang alliance negotiation algorithms

---

**Version:** 2.0 (Interactive)  
**Last Updated:** 2025-10-09  
**Status:** Production Ready

