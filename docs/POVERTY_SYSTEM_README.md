# Poverty System Plugin - Implementation Guide

## Overview

The Poverty plugin has been successfully integrated into the Criminal Minds application as a new simulation system, following the same architectural pattern as the existing Gang system. The poverty system models the social, psychological, and economic pressures experienced by people living in chronic poverty.

## Architecture

The Poverty system is designed as a **non-invasive plugin** that:
- Does NOT affect existing application functionality
- Can be toggled on/off independently
- Follows the established pattern used by the Gang system
- Uses its own debug window for monitoring
- Tracks events separately from other systems

## Core Components

### 1. **povertyService.ts** (src/services/povertyService.ts)
- Main service handling poverty simulation logic
- Methods:
  - getDefaultConfig() - Returns default poverty configuration
  - initializePersonalityStatus(personalityId) - Sets up personality poverty state
  - simulateDay() - Simulates one day of poverty for a personality
  - getPovertyStats() - Returns aggregate poverty statistics

**Key Features:**
- Welfare system simulation (DWP, PIP)
- Employment and income management
- Psychological stress tracking
- Housing crisis and homelessness
- Assault and harassment risk calculation
- Addiction and recovery systems
- Time-of-day dependent risk factors

### 2. **Types** (src/types.ts)
Added comprehensive TypeScript interfaces:
- PovertyEvent - Poverty simulation events
- PovertyPersonalityStatus - Individual personality poverty state
- PovertyConfig - System-wide configuration
- PovertyScore - Achievement/scoring system

Integrated into ExperimentalSettings:
`	ypescript
povertyEnabled: boolean;
povertyConfig: PovertyConfig;
`

### 3. **PovertyDebugWindow.tsx** (src/components/PovertyDebugWindow.tsx)
- Interactive UI for monitoring poverty system
- Draggable/resizable window
- Persistent window state in localStorage
- Tabs:
  - **Overview** - Crisis statistics
  - **People** - Individual poverty status
  - **Stats** - System configuration and metrics
  - **Events** - Chronological event log

Color scheme: Yellow borders and header (to distinguish from Gang system's red)

### 4. **PovertyIcon.tsx** (src/components/icons/PovertyIcon.tsx)
- SVG icon component for taskbar
- Shows £ symbol indicating economics focus

### 5. **App.tsx Integration**
- Imported povertyService and PovertyDebugWindow
- Added state management:
  `	ypescript
  const [povertyDebugOpen, setPovertyDebugOpen] = useState<boolean>(false);
  const [povertyEvents, setPovertyEvents] = useState<any[]>([]);
  const [povertyConversations, setPovertyConversations] = useState<any[]>([]);
  `
- Added ddPovertyEvent() callback for event tracking
- Integrated PovertyDebugWindow component rendering

### 6. **ExperimentalSettingsPanel.tsx**
- Added default poverty configuration to getDefaultExperimentalSettings()
- Can be enabled/disabled in experimental settings

## Poverty Events

The system tracks the following event types:

`	ypescript
'benefit_claim'    // DWP/PIP payment received
'benefit_denied'   // Claim rejected
'job_found'        // Short-term work found
'job_lost'         // Employment ended
'harassment'       // Verbal abuse, intimidation
'assault'          // Physical violence
'health_crisis'    // Medical emergency
'debt_incurred'    // Financial obligation
'debt_paid'        // Debt resolution
'eviction_notice'  // Housing threatened
'housing_secured'  // Housing obtained
'addiction'        // Substance abuse issue
'recovery'         // Seeking help
'relationship'     // Social connection change
'inspection'       // Welfare audit
'police_check'     // Law enforcement interaction
'overdose'         // Critical overdose incident
`

## Configuration

Default poverty configuration includes:

`	ypescript
{
  povertyEnabled: false,
  numberOfPovertyPersonalities: 2,
  simulationIntensity: 0.5,
  
  // Economic
  baseWelfareAmount: 25,                // £/day
  pipBaseAmount: 15,                    // £/day
  jobFindRate: 0.15,                    // 15% chance
  averageWagePerJob: 80,                // £ per gig
  fraudDetectionRate: 0.1,              // 10% catch rate
  
  // Psychological
  stressAccumulationRate: 0.05,
  alcoholAddictionRate: 0.03,
  mentalHealthDeclineRate: 0.04,
  recoveryRate: 0.02,
  
  // Safety
  assaultRiskBase: 0.08,
  harassmentFrequency: 0.1,
  timeOfDayFactor: true,                // Higher risk at night
  policeVisitFrequency: 0.05,
  deathRiskFromOverdose: 0.02,
  
  // Housing
  housingCrisisEnabled: true,
  evictionFrequency: 0.03,
  
  // Community
  communityTrustImportance: 0.7,
  partnershipStabilityBonus: 0.3,
  familySupportEnabled: true,
}
`

## Scoring System

The plugin implements three achievement medal system:

- **Gold Medal**: Survive 60+ days in poverty without losing housing or dying
- **Silver Medal**: Highest DWP payout ratio
- **Bronze Medal**: Longest survival under heavy alcohol use

## Integration Principles

The Poverty system follows these core principles:

1. **Non-Invasive**: Completely optional feature
2. **Independent**: Separate from Gang system
3. **Observable**: Debug window for full transparency
4. **Configurable**: All parameters can be adjusted
5. **Event-Driven**: Uses event callbacks for integration
6. **Storage-Friendly**: Limits event history to prevent memory issues
7. **Type-Safe**: Full TypeScript support

## Next Steps (Optional)

To fully activate the Poverty system in the UI:

1. **Taskbar Integration** - Add toggle button in Taskbar.tsx
2. **Settings Panel** - Add poverty configuration UI in SettingsModal.tsx
3. **Personality Integration** - Add poverty status display in personality panels
4. **Conversation Integration** - Reference poverty status in LLM prompts
5. **Achievement System** - Display poverty medals/achievements

## Testing Notes

✅ **Verified Non-Breaking Changes:**
- All existing functionality preserved
- No modifications to Chat/Personality/Gang systems
- Clean TypeScript compilation
- No linting errors
- Backward compatible with existing codebase

## File Changes Summary

| File | Change | Type |
|------|--------|------|
| src/services/povertyService.ts | NEW | Service |
| src/components/PovertyDebugWindow.tsx | NEW | Component |
| src/components/icons/PovertyIcon.tsx | NEW | Icon |
| src/types.ts | MODIFIED | Types Added |
| src/App.tsx | MODIFIED | Imports + State |
| src/components/ExperimentalSettingsPanel.tsx | MODIFIED | Config Added |

## Usage Example

To trigger a poverty event from conversation:

`	ypescript
addPovertyEvent(
  'assault',
  'Physical assault incident - requires hospital care',
  'critical'
);
`

To check poverty stats:

`	ypescript
const stats = povertyService.getPovertyStats(povertyConfig);
console.log(stats.totalInPoverty);           // Number of people
console.log(stats.averageStress);            // 0-100
console.log(stats.peopleMisssingHousing);    // Count
`

## Support for Future Integration

The system is designed to support future:
- Conversation context injection
- Personality-specific poverty traits
- Economic simulation integration
- Social welfare policy modeling
- Mental health impact tracking

---

**Status**: ✅ Successfully integrated and ready for use
**Last Updated**: 2025-10-25
**Breaking Changes**: None
