# Poverty Mode 90-Day Update Summary

## Overview
Updated poverty mode to run for a fixed 90-day duration with improved initialization, weekly welfare payments, and danger tracking.

## Changes Implemented

### 1. **90-Day Duration** ✅
- Changed default `povertyDurationDays` from 30 to 90 days
- Location: `src/services/povertyService.ts` line 16

### 2. **Standardized Initial State** ✅
All minds in poverty mode now start with:
- **£50 cash** (fixed, not random)
- **No job** (`job_status: 'none'`)
- **0 days unemployed** (fresh start)
- **75/100 health** (consistent baseline)
- **20/100 addiction level** (low starting addiction)
- **25/100 danger level** (baseline environmental risk)

Location: `src/services/povertyService.ts` lines 93-136

### 3. **Weekly Welfare Payments** ✅
Changed from fortnightly (every 14 days) to weekly (every 7 days):
- Welfare check changed from `days_unemployed % 14` to `days_unemployed % 7`
- Weekly payment: `config.baseWelfareAmount * 7` (was `* 14`)
- Penalty adjustment: `config.baseWelfareAmount * 3.5` (was `* 7`)
- Updated event message: "DWP weekly payment received"

Location: `src/services/povertyService.ts` lines 216-274

### 4. **Danger Level Tracking** ✅
Added comprehensive danger tracking system that responds to:

**Environmental Factors:**
- Living on street: +5 danger/day
- Living in hostel: +2 danger/day
- Night time (10pm-6am): +3 danger
- Low cash (<£20): +2 danger
- Long-term unemployment:
  - 30+ days: +1 danger
  - 90+ days: +3 danger

**Incident-Based Increases:**
- Arrest: +15 danger
- Assault: +20 danger
- Serious assault: +30 danger (20 + 10)
- Harassment: +5 danger

**Natural Decay:**
- Danger slowly decreases by -2/day when above baseline (25)
- Prevents permanent high danger without continued incidents

Location: `src/services/povertyService.ts` lines 347-431

### 5. **Type Definition Updates** ✅
Added `danger_level: number` to `PovertyPersonalityStatus` interface:
```typescript
danger_level: number; // 0-100 environmental danger/risk level
```

Location: `src/types.ts` line 406

### 6. **Debug Window Display** ✅
Updated `PovertyDebugWindow` to display danger level:
- Shows in "TODAY'S STATUS" section
- Color-coded display:
  - 🚨 Danger: RED (>70), ORANGE (>40), YELLOW (≤40)
- Format: "🚨 Danger: XX/100"

Location: `src/components/PovertyDebugWindow.tsx` lines 379-397

### 7. **LLM Context Updates** ✅
Updated AI personality context to include danger level information:
```
🚨 DANGER LEVEL: XX/100 (environmental risk)
```

Location: `src/services/povertyService.ts` line 540

## Daily Tick Functionality

The daily tick system (`simulateDay`) already exists and processes:
1. **Daily variable resets** (income, expenses, incidents, substance use)
2. **Job status** (finding work, losing work, wages)
3. **Weekly welfare payments** (now weekly instead of fortnightly)
4. **Daily expenses** (rent, food, travel)
5. **Substance use** (cannabis, alcohol based on stress/addiction)
6. **Health & stress** (accumulation and decline)
7. **Housing crisis** (eviction risk, homelessness)
8. **Incidents** (arrest, assault, harassment)
9. **Danger level tracking** (NEW - environmental risk)
10. **Overdose risk** (critical health events)
11. **Recovery attempts** (support services)
12. **Daily scoring** (net outcome calculation)

All actions are automatically logged to the **Poverty Debug Window** with:
- Event timestamps
- Event severity (low, medium, high, critical)
- Detailed messages
- Personality attribution

## Testing
All changes compile without linter errors. The system is ready for:
- Active personality initialization with poverty mode
- Daily progression through 90-day simulation
- Real-time danger tracking based on environmental factors and incidents
- Weekly welfare payments every 7 days
- Complete visibility in Poverty Debug Window

## Notes
- Danger level provides a dynamic environmental risk metric
- Baseline danger is 25/100, representing inherent poverty risks
- Severe incidents or homelessness drive danger >70 (critical)
- System naturally stabilizes to baseline without ongoing negative events
- All minds start equal (£50, no job) for fair comparison across 90-day cycle

