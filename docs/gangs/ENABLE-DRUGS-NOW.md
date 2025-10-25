# 💊 Enable Drug Economy - INSTANT

## Quick Enable (Copy & Paste into Browser Console)

**One-Liner:**
```javascript
(function(){const s=JSON.parse(localStorage.getItem('experimental_settings')||'{}');if(!s.gangsConfig){console.error('❌ Enable gangs first');return;}s.gangsConfig.drugEconomyEnabled=true;s.gangsConfig.drugSmugglingFrequency=0.5;s.gangsConfig.drugDealingFrequency=0.6;s.gangsConfig.drugDetectionRisk=0.12;s.gangsConfig.itemStealingEnabled=true;if(s.gangsConfig.gangs)Object.values(s.gangsConfig.gangs).forEach(g=>{g.money=g.money??0;g.totalEarnings=g.totalEarnings??0;g.items=g.items??[];g.drugsStash=g.drugsStash??0;});if(s.gangsConfig.memberStatus)Object.values(s.gangsConfig.memberStatus).forEach(m=>{m.drugsCarrying=m.drugsCarrying??0;m.drugsDealt=m.drugsDealt??0;m.drugsSmuggled=m.drugsSmuggled??0;m.drugsCaught=m.drugsCaught??0;m.sentenceExtensions=m.sentenceExtensions??0;});localStorage.setItem('experimental_settings',JSON.stringify(s));console.log('✅ Drug Economy Enabled! Reload page.');})();
```

**Better Formatted Version:**
```javascript
// Enable Drug Economy System
(function() {
  const settings = JSON.parse(localStorage.getItem('experimental_settings') || '{}');
  
  if (!settings.gangsConfig) {
    console.error('❌ Gang mode not configured. Enable gangs first.');
    return;
  }
  
  // Enable drug economy
  settings.gangsConfig.drugEconomyEnabled = true;
  settings.gangsConfig.drugSmugglingFrequency = 0.5;  // 5% per cycle
  settings.gangsConfig.drugDealingFrequency = 0.6;    // 9% per cycle  
  settings.gangsConfig.drugDetectionRisk = 0.12;      // 12% base risk
  settings.gangsConfig.itemStealingEnabled = true;
  
  // Fix existing gangs (backward compatibility)
  if (settings.gangsConfig.gangs) {
    Object.values(settings.gangsConfig.gangs).forEach(gang => {
      gang.money = gang.money ?? 0;
      gang.totalEarnings = gang.totalEarnings ?? 0;
      gang.items = gang.items ?? [];
      gang.drugsStash = gang.drugsStash ?? 0;
    });
  }
  
  // Fix existing members
  if (settings.gangsConfig.memberStatus) {
    Object.values(settings.gangsConfig.memberStatus).forEach(status => {
      status.drugsCarrying = status.drugsCarrying ?? 0;
      status.drugsDealt = status.drugsDealt ?? 0;
      status.drugsSmuggled = status.drugsSmuggled ?? 0;
      status.drugsCaught = status.drugsCaught ?? 0;
      status.sentenceExtensions = status.sentenceExtensions ?? 0;
    });
  }
  
  localStorage.setItem('experimental_settings', JSON.stringify(settings));
  console.log('✅ Drug Economy Enabled! Reload the page to apply.');
})();
```

## Steps:

1. **Open Browser Console**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Go to Console Tab**
3. **Paste the script above**
4. **Press Enter**
5. **Reload the page** (`F5` or `Ctrl+R`)

## What to Look For After Reload:

### PersonalityPanel (Left Side - Gang Leaders)
```
👥 3 members • 🗺️ 45% territory
💰 $0  💊 0g  📦 0    ← You'll see this now!
```

### Gang Debug Window
- Open it (if not already open)
- **Gangs Tab**: Shows money, drugs stash, items per gang
- **Members Tab**: Shows individual drug stats (smuggled, dealt, caught)

### Gang Event Feed
Within 30-60 seconds you should see:
- `💊 Successfully smuggled 25g drugs into prison! Total stash: 25g`
- `💰 Dealt 15g drugs for $450! Gang money: $450`
- `🚨 CAUGHT smuggling 30g drugs! Sent to SOLITARY...`

## Troubleshooting

**Still showing $0?**
1. Make sure you **reloaded the page** after running the script
2. Wait 30-60 seconds for first drug activity
3. Check console for `[GANGS]` logs to confirm drug economy is running
4. Verify `drugEconomyEnabled: true` in console:
   ```javascript
   JSON.parse(localStorage.getItem('experimental_settings')).gangsConfig.drugEconomyEnabled
   ```

**No drug events appearing?**
- Members must be in gangs (not independent)
- Members must not be imprisoned or killed
- Activities happen every 5 seconds at the frequency you set
- Check Gang Debug Window → Members tab to see if drug stats are incrementing

## Adjust Activity Level

**For Faster Testing (More Activity):**
```javascript
const s = JSON.parse(localStorage.getItem('experimental_settings'));
s.gangsConfig.drugSmugglingFrequency = 0.9;  // 9% per cycle - very frequent
s.gangsConfig.drugDealingFrequency = 1.0;     // 15% per cycle - constant
s.gangsConfig.drugDetectionRisk = 0.05;       // 5% risk - rarely caught
localStorage.setItem('experimental_settings', JSON.stringify(s));
location.reload();
```

**For Slower/Realistic (Less Activity):**
```javascript
const s = JSON.parse(localStorage.getItem('experimental_settings'));
s.gangsConfig.drugSmugglingFrequency = 0.2;  // 2% per cycle - rare
s.gangsConfig.drugDealingFrequency = 0.3;     // 4.5% per cycle - occasional
s.gangsConfig.drugDetectionRisk = 0.25;       // 25% risk - high danger
localStorage.setItem('experimental_settings', JSON.stringify(s));
location.reload();
```

## Give Gangs Starting Money (Optional)

If you want to test item purchasing immediately:
```javascript
const s = JSON.parse(localStorage.getItem('experimental_settings'));
Object.values(s.gangsConfig.gangs).forEach(gang => {
  gang.money = 1000;  // Give each gang $1000 to start
});
localStorage.setItem('experimental_settings', JSON.stringify(s));
location.reload();
```

Then you can test purchasing items in the browser console:
```javascript
// Example: Gang buys a prostitute visit
const { gangService } = await import('./services/gangService.js');
const settings = JSON.parse(localStorage.getItem('experimental_settings'));
const result = gangService.purchasePrisonItem(
  settings.gangsConfig,
  'gang_1',
  'prostitute_visit',
  'personality-id-here'
);
console.log(result.message);
```

