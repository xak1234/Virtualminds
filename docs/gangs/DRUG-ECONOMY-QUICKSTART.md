# 💊 Drug Economy - Quick Start Guide

## Enable the System

The drug economy is **disabled by default**. To enable it, you'll need to enable it in the gang configuration:

### Option 1: Via Browser Console
```javascript
// Get current settings
const settings = JSON.parse(localStorage.getItem('experimental_settings') || '{}');

// Enable drug economy
if (settings.gangsConfig) {
  settings.gangsConfig.drugEconomyEnabled = true;
  settings.gangsConfig.drugSmugglingFrequency = 0.5; // 5% per cycle
  settings.gangsConfig.drugDealingFrequency = 0.6;   // 9% per cycle
  localStorage.setItem('experimental_settings', JSON.stringify(settings));
}

// Reload the page
location.reload();
```

### Option 2: Modify Default Config
Edit `components/ExperimentalSettingsPanel.tsx`:
```typescript
drugEconomyEnabled: true,  // Change from false to true
```

## Quick Test Setup

For rapid testing, use high frequencies and low risk:

```javascript
const settings = JSON.parse(localStorage.getItem('experimental_settings') || '{}');
if (settings.gangsConfig) {
  settings.gangsConfig.drugEconomyEnabled = true;
  settings.gangsConfig.drugSmugglingFrequency = 0.9;  // 9% per cycle - very frequent
  settings.gangsConfig.drugDealingFrequency = 1.0;    // 15% per cycle - extremely frequent
  settings.gangsConfig.drugDetectionRisk = 0.05;      // 5% - low risk for testing
  localStorage.setItem('experimental_settings', JSON.stringify(settings));
}
location.reload();
```

## What to Watch

### 1. PersonalityPanel (Left Side)
Look for gang leaders - they now show:
```
👥 3 members • 🗺️ 45% territory
💰 $450  💊 35g  📦 2
```

### 2. Gang Debug Window
Open it to see detailed stats:
- **Gangs Tab**: Money, drugs, items per gang
- **Members Tab**: Individual drug activity (smuggled, dealt, caught)

### 3. Gang Event Feed
Watch for drug-related events:
- `💊 Successfully smuggled 25g drugs...`
- `💰 Dealt 15g drugs for $450...`
- `🚨 CAUGHT smuggling...`
- `🎯 Stole Case of Beer from rival gang...`

## Expected Behavior

With default settings (after enabling):
- Drug smuggling attempts occur randomly (30% frequency)
- Members with drugs will attempt to deal them (40% frequency)
- 15% chance of getting caught during smuggling
- ~7-10% chance of getting caught dealing
- Gangs accumulate money over time
- Item theft happens occasionally (5% chance per cycle)

## Typical Timeline

**First 30 seconds:**
- First smuggling attempts (some succeed, some fail)
- Successful smugglers start carrying drugs

**1-2 minutes:**
- Dealing begins as members accumulate drugs
- First gang earns $200-500
- Some members get caught and sent to solitary

**3-5 minutes:**
- Gangs accumulate $500-2000
- First item purchases (cigarettes, beer)
- Item theft attempts between gangs
- Violence from failed theft

**10+ minutes:**
- Established drug operations
- Multiple items per gang
- Regular violence over resources
- Clear economic leaders emerge

## Manual Testing Commands

Open browser console and test individual functions:

### Smuggle Drugs
```javascript
// Get the gang service
const { gangService } = await import('./services/gangService');

// Get current config from localStorage
const settings = JSON.parse(localStorage.getItem('experimental_settings'));
let config = settings.gangsConfig;

// Smuggle drugs for a personality
const result = gangService.attemptDrugSmuggling(config, 'personality-id-here');
console.log(result.message);

// Update localStorage with new config
settings.gangsConfig = result.config;
localStorage.setItem('experimental_settings', JSON.stringify(settings));
```

### Deal Drugs
```javascript
const result = gangService.attemptDrugDealing(config, 'personality-id-here');
console.log(result.message);
```

### Purchase Item
```javascript
const result = gangService.purchasePrisonItem(
  config, 
  'gang_1',              // Gang ID
  'prostitute_visit',    // Item type
  'personality-id-here'  // Who gets the benefit
);
console.log(result.message);
```

### Steal Item
```javascript
const result = gangService.attemptItemTheft(
  config,
  'thief-personality-id',
  'target-gang-id'
);
console.log(result.message);
```

## Troubleshooting

### "No drug activity happening"
- Check `drugEconomyEnabled` is `true` in gang config
- Check frequencies aren't too low (minimum 0.1 recommended)
- Ensure personalities are in gangs (not independent)
- Wait 30-60 seconds for first attempts

### "Money isn't increasing"
- Members need drugs to deal (smuggling must succeed first)
- Check `drugDealingFrequency` (higher = more attempts)
- Lower `drugDetectionRisk` for more successful deals
- Check Gang Debug Window → Members tab for drug stats

### "Too many members getting caught"
- Lower `drugDetectionRisk` (default 0.15 = 15%)
- Reduce frequencies to make attempts less common
- Remember: getting caught is part of the simulation!

### "Items not appearing"
- Check gang has enough money for the item
- Items only appear after purchase/theft
- Look in Gang Debug Window → Gangs tab → gang's item count

## Adjusting Difficulty

**Easy Mode (Profitable):**
```javascript
drugSmugglingFrequency: 0.6,
drugDealingFrequency: 0.8,
drugDetectionRisk: 0.08,
```

**Normal Mode (Balanced):**
```javascript
drugSmugglingFrequency: 0.3,
drugDealingFrequency: 0.4,
drugDetectionRisk: 0.15,
```

**Hard Mode (Dangerous):**
```javascript
drugSmugglingFrequency: 0.2,
drugDealingFrequency: 0.25,
drugDetectionRisk: 0.30,
```

## Performance Notes

The drug economy adds minimal overhead:
- Only runs when `drugEconomyEnabled` is `true`
- Checks happen during existing gang update cycles (every 5 seconds)
- No impact on UI rendering performance
- Statistics stored in existing gang config structure

## Have Fun!

The drug economy adds a whole new layer of strategy and emergent behavior to gang mode. Watch as:
- Poor gangs take risks to catch up economically
- Rich gangs become targets for theft
- Violence increases around valuable items
- Gang hierarchies form around economic power

Experiment with different settings to find the right balance for your simulation!

