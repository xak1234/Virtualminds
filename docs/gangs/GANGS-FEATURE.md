# Prison Gangs Experimental Feature

## Overview

The **Prison Gangs** feature is an advanced experimental psychology simulation that places AI personalities in a simulated prison environment. This feature enables the study of group dynamics, loyalty, authority, violence, and survival behaviors under extreme conditions.

## Features

### Core Mechanics

1. **Gang Formation**
   - Create 2-6 competing gangs
   - Assign custom names and colors to each gang
   - Designate gang leaders from loaded personalities
   - Assign members to gangs or allow them to remain independent

2. **Gang Hierarchy**
   - **Leader**: Commands the gang, highest respect
   - **Lieutenant**: Second-in-command (auto-assigned)
   - **Soldier**: Regular gang member
   - **Recruit**: New gang member with lower status
   - **Independent**: Not affiliated with any gang

3. **Gang Statistics**
   - **Territory Control**: 0-100% of prison control
   - **Resources**: 0-100 gang power/wealth
   - **Reputation**: 0-100 fear/respect factor
   - **Violence**: 0-100 gang aggression tendency
   - **Loyalty**: 0-100 member cohesion

4. **Member Statistics**
   - **Loyalty**: 0-100 dedication to gang
   - **Respect**: 0-100 standing among peers
   - **Violence**: 0-100 individual aggression
   - **Hits**: Number of violence actions taken
   - **Status**: Active or in solitary confinement

### Dynamic Systems

#### Active Conversation-Based Interactions

**Real-time Gang Processing:**
- Every conversation message is analyzed for gang interactions
- Automatic loyalty adjustments between same-gang members
- Respect changes between rival gang members
- Violence triggers based on hostile language
- Recruitment opportunities during positive conversations

**Keyword-Based Violence Triggers:**
- Hostile keywords: "threaten", "attack", "fight", "kill", "destroy", "hurt", "beat", "smash", "crush"
- When rivals use hostile language, violence probability increases
- Violence frequency setting controls trigger chance

**Sentiment-Based Recruitment:**
- Positive keywords: "agree", "respect", "like", "trust", "friend", "ally", "together", "join", "help"
- 15% chance per positive interaction for recruitment attempt
- Evaluates last 6 messages for sentiment
- Uses relationship affinity if relationship tracking enabled

#### Recruitment System
- **Active Recruitment**: Gangs recruit during conversations based on positive sentiment
- **Random Recruitment**: 5% chance every 5 seconds if enabled
- Recruitment success based on:
  - Gang reputation (up to +20% chance)
  - Relationship affinity with gang leader (up to +15%)
  - Prison environment intensity (up to +15%)
  - Current gang loyalty (blocks if > 60%)
  - Conversation sentiment (up to +30%)

#### Violence & Conflict
- Personalities can engage in violent actions ("hits")
- Violence affects:
  - Personal respect (increases for aggressor)
  - Target respect (decreases)
  - Territory control in gang wars
- After 3+ hits, members may be sent to **solitary confinement**

#### Territory Wars
- Gangs compete for control of prison territory
- Territory shifts based on successful violence
- Territory affects gang resources and reputation

#### Loyalty Decay
- Gang loyalty naturally decreases over time
- Low loyalty can lead to members leaving gangs
- Loyalty decay rate is configurable

#### Solitary Confinement
- Violent members can be imprisoned in solitary
- Temporary timeout (default: 1 minute)
- Prevents participation in gang activities while imprisoned
- Visual indicator shows [SOLITARY] status

### Visual Indicators

#### Gang Badges
On the Personality Panel, gang members display:
- **Colored Badge**: Gang color identification
- **Crown Icon (👑)**: Gang leader
- **Star Icon (⭐)**: Regular member
- **Lock Icon (🔒)**: In solitary confinement
- **Gang Name**: Shown below personality name
- **[SOLITARY]**: Animated red text for imprisoned members

## Configuration

### Accessing Gang Settings

1. Open **Settings** (gear icon)
2. Navigate to **Experimental** tab
3. Scroll to **🔒 Prison Gangs (Experimental Psychology)**
4. Enable **Prison Gangs Simulation**

### Configuration Options

#### Basic Settings

- **Number of Gangs** (2-6)
  - How many gangs compete in the prison
  
- **Prison Environment Intensity** (0.0-1.0)
  - 0.0 = Minimum security, relaxed
  - 0.5 = Medium security, moderate tension
  - 1.0 = Maximum security, extreme violence

- **Violence Frequency** (0.0-1.0)
  - Controls how often violence occurs
  - Higher values = more violent environment

#### Advanced Settings

- **Gang Recruitment Enabled**
  - Allow gangs to recruit new members dynamically

- **Territory Wars Enabled**
  - Enable gang fights over prison control

- **Independent Personalities Allowed**
  - Permit personalities to remain unaffiliated

- **Solitary Confinement Enabled**
  - Punish violent behavior with isolation

- **Loyalty Decay Rate** (0.0-1.0)
  - How quickly gang loyalty decreases

### Gang Configuration

For each gang, you can:
- **Set Gang Name**: Custom gang identity
- **Choose Gang Color**: Visual identification color
- **Assign Gang Leader**: Select from loaded personalities
- **Add/Remove Members**: Click personality buttons to assign

### Prison Statistics

Real-time statistics display:
- Total prisoners in system
- Independent (unaffiliated) count
- Members in solitary confinement
- Total violence hits across all gangs

## Usage Examples

### Scenario 1: Studying Leadership
1. Create 3 gangs
2. Assign different personality types as leaders
3. Set prison intensity to 0.5
4. Enable recruitment
5. Observe which leader attracts more members

### Scenario 2: Extreme Violence Study
1. Create 2 rival gangs
2. Set prison intensity to 1.0
3. Set violence frequency to 0.8
4. Enable territory wars
5. Enable solitary confinement
6. Observe escalation and consequences

### Scenario 3: Loyalty Research
1. Create 4 gangs
2. Set loyalty decay to 0.5
3. Disable recruitment
4. Observe which gangs maintain cohesion

### Scenario 4: Independent vs. Gang
1. Create 2 gangs
2. Leave some personalities independent
3. Enable recruitment
4. Watch if independents join or resist

## AI Behavior Impact

When Gangs are enabled, AI personalities will:

- **Recognize their gang affiliation** in responses
- **Show loyalty** to gang members
- **Display hostility** toward rival gangs
- **Reference territory and respect** in conversations
- **React to solitary confinement** status
- **Adapt behavior** to prison environment intensity

### Automatic Gang Events

**During Conversations:**
- ⚔️ **Violence Events**: Triggered by hostile language between rivals
- 🤝 **Recruitment Success**: When gang members sway independents
- 💪 **Loyalty Boost**: +0.5 loyalty per message between same-gang members
- 📉 **Respect Loss**: -1 respect per hostile interaction with rivals

**Random Background Events (Every 5 seconds):**
- ⚔️ **Random Violence**: 10% of violence frequency between random rivals
- 🤝 **Random Recruitment**: 5% chance to recruit random independents
- 🔓 **Solitary Release**: Automatic release after timeout
- 📊 **Stat Updates**: Loyalty decay, reputation changes, territory shifts

**All events are displayed in:**
- CLI output with emoji indicators
- Chat history as system messages
- Console logs with [GANGS] prefix

### Example AI Context

The AI receives context like:
```
PRISON ENVIRONMENT: You are a soldier in The Crimson Syndicate. 
Your gang controls 35.2% of the territory. Gang reputation: 72/100. 
Your loyalty: 85/100. Your respect: 60/100. Violence level: 45/100. 
Hits taken: 2. Rival gangs: The Iron Circle, The Shadow Council.

⚠️ WARNING: You are communicating with a RIVAL GANG MEMBER. 
Exercise caution and consider your gang's interests.
```

## Psychology Research Applications

### Study Areas

1. **Group Formation**: How personalities cluster into gangs
2. **Leadership Emergence**: Which traits make effective prison leaders
3. **Loyalty Dynamics**: What maintains or breaks gang loyalty
4. **Violence Escalation**: How conflict spirals in constrained environments
5. **Authority Response**: Reactions to punishment (solitary)
6. **Survival Strategies**: Independent vs. gang-affiliated behaviors
7. **Social Hierarchies**: Rank emergence and respect distribution
8. **Territory Competition**: Resource conflict resolution

### Experimental Controls

The feature provides fine-grained control over:
- Environmental stressors (intensity)
- Violence permissiveness (frequency)
- Social mobility (recruitment)
- Punishment systems (solitary)
- Group cohesion (loyalty decay)

## Technical Details

### Gang Service (`services/gangService.ts`)

The gang system is managed by a centralized service that handles:
- Gang initialization and configuration
- Member assignment and removal
- Recruitment attempts
- Violence simulation
- Dynamic updates (loyalty decay, reputation changes)
- Context generation for AI prompts

### Data Persistence

Gang configuration is stored in:
- `ExperimentalSettings.gangsConfig`
- Persisted to localStorage
- Synchronized across all conversations

### Update Frequency

**Every 5 Seconds:**
- Loyalty decay based on loyalty decay rate
- Solitary confinement release checks
- Resource/reputation adjustments based on territory
- Random gang events (violence, recruitment)

**Every Conversation Message:**
- Gang interaction processing
- Sentiment analysis for recruitment
- Violence trigger checks
- Loyalty and respect updates

## Disabling the Feature

To turn off Prison Gangs:

1. Go to Settings → Experimental tab
2. Uncheck **Enable Prison Gangs Simulation**
3. All gang badges and context will be removed
4. AI personalities will return to normal behavior
5. Gang configuration is preserved for re-enabling

## Best Practices

1. **Start with moderate settings** (intensity: 0.5, violence: 0.3)
2. **Assign leaders first** to establish gang structure
3. **Monitor statistics** to track simulation health
4. **Use with relationship tracking** for enhanced dynamics
5. **Combine with mood system** for emotional responses
6. **Enable autonomous communication** for gang interactions

## Warnings

⚠️ **Content Warning**: This feature simulates prison violence and may generate disturbing content. Use for research purposes only.

⚠️ **Performance**: Gang dynamics updates run every 5 seconds. With many personalities, this may impact performance.

⚠️ **Experimental**: This is a research feature and may produce unexpected AI behaviors.

## Implemented Features ✅

- ✅ Gang formation and configuration
- ✅ Gang hierarchies and leadership
- ✅ Territory control system
- ✅ Violence simulation with consequences
- ✅ Solitary confinement system
- ✅ **Active conversation-based interactions**
- ✅ **Sentiment-based recruitment algorithms**
- ✅ **Keyword-triggered violence events**
- ✅ **Loyalty and respect dynamics**
- ✅ **Random background gang events**
- ✅ Real-time gang statistics
- ✅ Visual gang badges on personalities
- ✅ CLI event notifications

## Future Enhancements

Potential additions:
- Gang events (riots, truces, betrayals)
- Contraband system (resources trading)
- Escape attempts
- Gang alliances and treaties
- Detailed violence types (fights, ambushes, assassinations)
- Reputation-based power shifts
- Guard NPC interactions
- Prison economy simulation
- Gang territory visualization on UI
- Member rank progression system
- Gang meeting events
- Personality trauma from violence

## Credits

Designed for psychological research into group dynamics, authority, loyalty, and survival behaviors in extreme social environments.

---

**Version**: 1.0  
**Last Updated**: 2025-10-09  
**Status**: Experimental

