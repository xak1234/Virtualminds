# Poverty Mode 12-Variable System Update - Complete

## Overview
Updated the poverty simulation system to use a comprehensive 12-variable daily tracking system with time-based duration support, "struck-off benefits" status (equivalent to gang death), and enhanced UI indicators.

## Changes Made

### 1. **Updated Types (src/types.ts)**

#### PovertyPersonalityStatus Interface
Added 12 core daily variables that reset/update each day:
- `cash_on_hand` - Current £ available
- `income_today` - £ earned + benefits today
- `expenses_today` - £ spent on rent, food, travel
- `days_unemployed` - Running count
- `job_status` - 'none' | 'temp' | 'employed' | 'fired'
- `health` - 0-100 combined physical + mental
- `addiction_level` - 0-100 dependency
- `cannabis_consumption` - Grams or £ spent per day
- `welfare_income_today` - DWP/PIP £ today
- `alcohol_units` - Units consumed today
- `incident_today` - 'none' | 'harassment' | 'assault' | 'arrest'
- `daily_score` - Net outcome for the day

#### Critical Status (Similar to Gang Death)
- `struckOffBenefits` - Permanently struck off (equivalent to being "killed")
- `struckOffAt` - Timestamp when struck off
- `struckOffReason` - Reason for being struck off

#### PovertyConfig Updates
Added time-based duration settings:
- `povertyDurationDays` - Number of days mode should run (0 = indefinite)
- `povertyStartDate` - Timestamp when activated
- `povertyEndDate` - Timestamp when it will end
- `currentSimulationDay` - Current day counter

Added daily expense settings:
- `baseRentPerDay` - £ per day for rent/housing
- `baseFoodCostPerDay` - £ per day for food
- `baseTravelCostPerDay` - £ per day for travel
- `cannabisPricePerGram` - £ per gram

### 2. **Updated Poverty Service (src/services/povertyService.ts)**

#### Enhanced simulateDay()
- Resets daily variables at start of each day
- Tracks job status changes (none → temp → employed → fired)
- Calculates daily income from jobs and welfare
- Processes welfare payments fortnightly
- **FRAUD DETECTION: 3 strikes = STRUCK OFF PERMANENTLY**
- Calculates daily expenses (rent, food, travel)
- Tracks substance use (cannabis & alcohol) with costs
- Updates health based on physical + mental factors
- Tracks daily incidents (harassment, assault, arrest)
- Calculates daily score based on net balance and health
- All variables influence conversation topics naturally

#### Enhanced getPovertyContext()
- Displays all 12 core variables prominently
- Shows critical "STRUCK OFF" status clearly
- Provides context for conversations
- Emphasizes poverty-focused topics

### 3. **Updated UI Components**

#### Header (src/components/Header.tsx)
Added poverty status indicator when active:
```
🍺 POVERTY ACTIVE
Poverty Environment Simulation Running
```
- Displays in red font with pulsing animation
- Similar style to gangs indicator
- Includes debug window button with beer can icon 💰

#### Poverty Debug Window (src/components/PovertyDebugWindow.tsx)
Enhanced with comprehensive 12-variable display:
- New "Personalities" tab showing all tracked variables
- **HOMELESS status** prominently displayed for struck-off personalities
- Color-coded displays:
  - Green: Income, cash, positive values
  - Red: Expenses, negative values, critical status
  - Orange: Addiction, warnings
  - Yellow: Incidents, cautions
- Real-time tracking of:
  - Cash flow (income vs expenses)
  - Job status
  - Health & addiction levels
  - Daily incidents
  - Welfare fraud warnings (X/3 strikes)
- Struck-off personalities shown with red background

#### Main Screen Display (src/App.tsx)
Added **HOMELESS** overlays similar to gang death masks:
- Profile image with beer can icon 🍺 overlay
- Yellow glowing border (vs red for gang deaths)
- Shows "HOMELESS" status
- Displays "Struck off DWP" subtitle
- Animated pulse effect
- Positioned with other status indicators

### 4. **Game Mechanics**

#### Fraud Detection System
- Fortnightly welfare checks
- 3 strikes = PERMANENT removal from benefits
- Warning messages show X/3 strikes
- Strike 3 = "STRUCK OFF" status activated

#### Daily Variables Flow
1. **Income**: Job wages + welfare payments
2. **Expenses**: Rent + food + travel + substances
3. **Net Balance**: Income - Expenses affects cash
4. **Incidents**: Max 1 per day (prioritized by severity)
5. **Daily Score**: Calculated from net balance, health, stress, incidents

#### Job System
- `none` → can search for work
- `temp` → temporary contracts (can end randomly)
- `employed` → stable employment (small fire risk)
- `fired` → back to unemployment

#### Struck-Off Status (Equivalent to Gang Death)
When struck off benefits:
- Cannot receive welfare payments ever again
- Forced onto streets (housing = 'street')
- Displayed as "HOMELESS" on main screen
- Marked with ⚰️ icon in debug window
- Profile shown with beer can overlay
- Conversations reflect desperate situation

### 5. **Conversation Integration**

All 12 variables influence conversation topics:
- Cash struggles and poverty
- Job hunting or employment
- Benefits system experiences
- Housing insecurity
- Substance use as coping mechanism
- Daily incidents and violence
- Health and addiction impacts
- Welfare fraud fears

Variables change daily and influence:
- Personality behavior
- Conversation priorities
- Interaction dynamics
- Story progression

## Visual Indicators Summary

### When Poverty Mode Active:
1. **Header**: 🍺 POVERTY ACTIVE (red, pulsing)
2. **Debug Button**: 💰 icon in header
3. **Main Screen Overlays**: HOMELESS personalities with beer can icons
4. **Debug Window**: Comprehensive 12-variable tracking

### Struck-Off / Homeless Display:
- Similar to gang death masks but yellow theme
- Profile image + 🍺 overlay
- "HOMELESS" label
- "Struck off DWP" subtitle
- Pulsing animation

## Files Modified
- ✅ src/types.ts
- ✅ src/services/povertyService.ts
- ✅ src/components/Header.tsx
- ✅ src/components/PovertyDebugWindow.tsx
- ✅ src/App.tsx

## Testing Recommendations
1. Enable poverty mode in experimental settings
2. Set duration (e.g., 30 days)
3. Watch personalities accumulate fraud strikes
4. Observe when personality gets struck off (3 strikes)
5. Check main screen for HOMELESS overlay
6. Open poverty debug window to see all 12 variables
7. Monitor conversations referencing poverty topics

## Key Features
✅ 12-variable daily tracking system
✅ Time-based duration support
✅ Fraud detection with 3-strike system
✅ "Struck off" = homeless status (like gang death)
✅ Comprehensive debug window with logging
✅ Main screen HOMELESS overlays
✅ Poverty status indicator in header
✅ All variables influence conversations naturally
✅ Daily score calculation
✅ Job status progression system
✅ Substance use tracking with costs
✅ Daily incident system (one per day)

## Status: ✅ COMPLETE
All features implemented, tested, and linter-clean.

