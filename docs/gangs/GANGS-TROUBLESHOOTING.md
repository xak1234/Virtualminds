# Gang System Troubleshooting Guide

## 🔧 Known Issue: Conversations Not Starting

### Problem
When gangs are enabled, conversations are being stopped immediately before anyone can speak.

### Root Cause
The gang dynamics system updates `experimentalSettings` every 5-10 seconds, which was causing React effects to restart and clear conversation state.

### Fixes Applied

1. **Added `experimentalSettingsRef`** - Prevents callback recreation
2. **Removed dependencies** on `experimentalSettings` from autonomous communication
3. **Debounced localStorage saves** to 500ms
4. **Paused gang updates during conversations** - Prevents interference
5. **Used local `isActive` flags** instead of React state for conversation tracking
6. **Changed gang update frequency** from 5 to 10 seconds

### Test Steps

After restarting the dev server:

1. **Refresh your browser** (Ctrl+R or F5)
2. **Login**: `login admin superuser`
3. **Enable gangs**: Settings → Experimental → Enable Prison Gangs
4. **Assign gang members**: Click personalities to assign to gangs
5. **Try conversation**: `converse Donald_Trump Lucy_Letby`

### If Still Not Working

**Quick Workaround - Test Without Gangs:**
```bash
# In Settings → Experimental
# 1. DISABLE "Prison Gangs Simulation"
# 2. Try: converse Donald_Trump Lucy_Letby
# This verifies the base conversation system works
```

### Debugging Steps

If conversations still fail:

1. **Check console for errors** during conversation start
2. **Look for this pattern:**
   ```
   [CONVERSATION DEBUG] Setting conversingPersonalityIds: Array(X)
   [CONVERSATION DEBUG] Starting round 1/3...
   [CONVERSATION DEBUG] About to get response from <name>
   ```

3. **If you see:** `Conversation was stopped externally`
   - Something external is clearing the state
   - Try disabling all experimental features except gangs

4. **Check for:**
   - `[GANGS] Error getting gang context` - Gang context breaking AI
   - `[CONVERSATION DEBUG] Error getting response` - AI call failing

### Known Workarounds

**Workaround 1: Disable Gang Updates**
Temporarily comment out the gang dynamics useEffect in App.tsx (lines 2057-2124)

**Workaround 2: Simple Test**
```bash
# Disable gangs
# Test: converse Donald_Trump Lucy_Letby
# If this works, re-enable gangs and test again
```

### What Should Work

Once fixed, you should see:
```
[CONVERSATION DEBUG] Setting conversingPersonalityIds: Array(12)
[CONVERSATION DEBUG] Starting round 1/3...
[GANGS] Added context for Donald_Trump
[CONVERSATION DEBUG] About to get response from Donald_Trump
[CONVERSATION DEBUG] Got response from Donald_Trump: "..."
[GANGS] GANG VIOLENCE: ... (if violence triggers)
```

### Contact

If issue persists after server restart and browser refresh, the conversation system may need a deeper architectural fix to isolate gang updates from conversation state.

---
**Status**: Under investigation  
**Priority**: High  
**Last Updated**: 2025-10-09

