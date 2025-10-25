# 💊💰 Gang Drug Economy System

## Overview
The Drug Economy System adds a comprehensive illegal drug trade mechanic to the gang simulation. Gang members can smuggle drugs into prison, deal them for profit, buy luxury items, and steal from rival gangs - all with realistic risks and consequences.

## Features

### 1. **Drug Smuggling** 💊
- Members attempt to smuggle drugs into the prison (10-50 grams per attempt)
- Base detection risk: 15% (configurable)
- Guards add 0-30% additional risk based on alertness
- Experience reduces risk: up to -10% for veteran smugglers

**Consequences if Caught:**
- Drug stats incremented (`drugsCaught++`, `sentenceExtensions++`)
- Gang reputation -10
- 60% chance of solitary confinement (1 minute)
- Lose the drugs

**Success:**
- Drugs added to member's inventory and gang stash
- Gang reputation +2
- Member's smuggling experience increases

### 2. **Drug Dealing** 💰
- Members sell 5-25 grams of their carried drugs
- Earns $20-$50 per gram (random market price)
- Lower detection risk than smuggling (7.5% base + 0-20% guard)
- Requires drugs in inventory

**Consequences if Caught:**
- Lost drugs
- 30% chance of solitary confinement (45 seconds)
- No money earned

**Success:**
- Gang earns money (added to gang treasury)
- Member gains +3 respect
- Gang reputation +1
- Member's dealing experience increases

### 3. **Prison Items & Rewards** 🛒

Gangs can purchase items with their drug money:

| Item | Cost | Benefits |
|------|------|----------|
| **Prostitute Visit** | $500 | +20 loyalty, +10 respect |
| **Case of Beer** | $200 | +15 loyalty, +5 respect, morale boost |
| **Cigarettes** | $100 | +10 loyalty, trade currency |
| **Phone Time** | $150 | +8 loyalty, communication benefit |
| **Luxury Food** | $80 | +5 loyalty, health boost |

Items are stored in gang inventory and provide bonuses when used by members.

### 4. **Item Theft** 🎯
- Gangs can attempt to steal items from rival gangs
- 70% chance of being detected → triggers violence
- Success grants +10 respect to the thief
- High-risk, high-reward mechanic

**If Detected:**
- Violence breaks out between gangs
- Uses existing violence simulation system
- Can result in injuries, solitary, or death (if enabled)

## Statistics Tracked

### Gang-Level
- `money` - Current cash balance
- `totalEarnings` - Lifetime drug profits
- `drugsStash` - Stored drugs (grams)
- `items[]` - Purchased/stolen items

### Member-Level
- `drugsCarrying` - Currently held drugs (grams)
- `drugsDealt` - Total drugs sold (lifetime)
- `drugsSmuggled` - Total drugs brought in (lifetime)
- `drugsCaught` - Times caught by guards
- `sentenceExtensions` - Additional time added to sentence

## Configuration

Enable in `GangsConfig`:
```typescript
drugEconomyEnabled: true,           // Master toggle
drugSmugglingFrequency: 0.3,        // 0.0-1.0 (30% = 3% per cycle)
drugDealingFrequency: 0.4,          // 0.0-1.0 (40% = 6% per cycle)
drugDetectionRisk: 0.15,            // 0.0-1.0 (15% base risk)
itemStealingEnabled: true,          // Allow theft between gangs
```

## Game Mechanics

### Smuggling Frequency
- Checked every gang update cycle (default: every 5 seconds)
- `smugglingFrequency * 0.1` = actual chance per member
- Example: 0.3 frequency = 3% chance per member per cycle

### Dealing Frequency
- Only active if member has drugs to carry
- `dealingFrequency * 0.15` = actual chance
- Example: 0.4 frequency = 6% chance per cycle

### Risk Calculation
```
Total Risk = Base Risk + Guard Alertness - Experience Bonus
Where:
- Base Risk: configured (default 15%)
- Guard Alertness: random 0-30% (smuggling) or 0-20% (dealing)
- Experience Bonus: up to 10% reduction from previous successes
```

### Money Economy
- Drug prices: $20-$50/gram (random on each deal)
- Average earnings: ~$300-$500 per successful deal
- Items cost $80-$500
- Money accumulates in gang treasury

## UI Display

### PersonalityPanel (Gang Leaders)
Shows on leader's quick slot:
- 💰 $X - Gang's current money
- 💊 Xg - Gang's drug stash
- 📦 X - Number of items owned

### Gang Debug Window

**Gangs Tab:**
- Money, drugs, items, and total earnings per gang

**Members Tab:**
- Individual drug activity stats (carrying, smuggled, dealt, caught)
- Sentence extensions from drug offenses

## Integration with Existing Systems

### Violence System
- Failed theft attempts trigger violence
- Uses existing `simulateViolence()` function
- Can escalate to weapons usage, solitary, or death

### Guard System
- Guards' alertness affects detection
- Bribery system still applies for weapons (separate mechanic)

### Solitary Confinement
- Drug offenses can result in solitary
- Smuggling: 60% chance, 1 minute
- Dealing: 30% chance, 45 seconds

### Gang Events
- Drug activities generate gang events visible in feed
- Events include: smuggling success/failure, dealing profit, theft attempts

## Sound Effects
Drug-related events trigger gang sound effects:
- `violence.mp3` - Item theft gone wrong
- Existing gang sounds for violence/imprisonment

## Strategy Notes

### For Players
1. **Start Small**: Build up drug stash before dealing
2. **Risk Management**: Veterans have lower detection risk
3. **Invest Profits**: Use money to buy items that boost loyalty
4. **Defend Resources**: Gangs with items become theft targets
5. **Balance Greed**: More dealing = more money but higher exposure

### Gang Dynamics
- Rich gangs attract theft attempts → more violence
- Poor gangs may take risks to catch up
- Items provide tangible benefits beyond money
- Economic disparity can fuel gang wars

## Event Messages

**Smuggling:**
- Success: `💊 Successfully smuggled 25g drugs into prison! Total stash: 50g`
- Caught: `🚨 CAUGHT smuggling 25g drugs! Sent to SOLITARY for 1 minute. Sentence extended!`

**Dealing:**
- Success: `💰 Dealt 15g drugs for $450! Gang money: $1200`
- Caught: `🚨 CAUGHT dealing 15g drugs! Lost drugs. Sent to SOLITARY for 45 seconds.`

**Items:**
- Purchase: `🛒 Purchased Prostitute Visit for $500. Remaining: $700`
- Theft Success: `🎯 Stole Case of Beer from The Sharks! (+10 respect)`
- Theft Failed: `⚔️ DETECTED! The Sharks defended their stash. [Violence Result]`

## Testing

To test the system:
1. Enable gangs mode
2. Load 3+ personalities into different gangs
3. Set `drugEconomyEnabled: true` in gang config
4. Watch the Gang Debug Window → Gangs tab for money stats
5. Check PersonalityPanel for gang leader's money display
6. Events will appear in the gang event feed

Adjust frequencies for faster testing:
- `drugSmugglingFrequency: 0.8` (high activity)
- `drugDealingFrequency: 0.9` (very frequent)
- `drugDetectionRisk: 0.05` (low risk = more success)

## Future Enhancements

Possible additions:
- Drug quality levels (low/high grade) affecting prices
- Drug addiction among inmates (side effects)
- Guard corruption (pay guards to ignore drug activity)
- Drug wars (territory disputes over dealing areas)
- Money laundering / contraband exchange
- Black market weapon purchases with drug money
- Rival gang undercover infiltration

## Version History

**V19** - Initial drug economy system
- Drug smuggling and dealing
- Money earning and item purchasing
- Item theft with violence risk
- Full statistics tracking
- UI integration in debug window and personality panel

