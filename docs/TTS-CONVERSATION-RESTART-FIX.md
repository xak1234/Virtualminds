# TTS Conversation Restart Fix

## Problem Description

The ElevenLabs TTS integration was causing conversations to restart after only speaking about 2 words. This created a frustrating loop where conversations would begin, get interrupted, and restart repeatedly.

## Root Cause Analysis

The issue was in the TTS service's aggressive interruption logic in `src/services/ttsService.ts`. The system had an interruption mechanism designed to prevent sentence restarts, but it was actually **causing** them instead.

### The Problematic Flow:

1. **Conversation starts** - AI generates response and calls `speak()` with ElevenLabs
2. **ElevenLabs API call** - Takes 1-3 seconds to generate audio
3. **Conversation logic continues** - While waiting for TTS, the conversation system may trigger another response
4. **Interruption triggers** - The new speak request sees the same speaker is "currently speaking" and cancels the current audio
5. **Restart cycle** - This creates a loop where conversations keep restarting

### Key Issue Location:

The problematic code was around lines 1408-1445 in `src/services/ttsService.ts`, where any new TTS request from the same speaker would immediately cancel the current speech, regardless of timing or content similarity.

## The Solution

### 1. Intelligent Interruption Logic

Replaced the aggressive interruption with smart logic that considers:

- **Content Similarity**: Only interrupt if the new text is significantly different from what's currently playing
- **Minimum Speaking Time**: Enforce a grace period (2 seconds for ElevenLabs, 1 second for others) before allowing interruptions
- **Text Analysis**: Compare new text with current/queued text to prevent duplicate or similar content from causing interruptions

### 2. Enhanced Timing Tracking

Added `startTime` tracking to `PendingSpeechRequest` interface to monitor how long each TTS request has been active.

### 3. Improved Logging

Added comprehensive debug logging to help track TTS requests and interruption decisions.

## Code Changes

### Modified Files:

1. **`src/services/ttsService.ts`**:
   - Enhanced `PendingSpeechRequest` interface with `startTime` property
   - Replaced aggressive interruption logic with intelligent content and timing analysis
   - Added comprehensive debug logging
   - Implemented grace periods specific to TTS providers

### New Files:

1. **`scripts/testing/test-tts-conversation-fix.js`**: Test script to verify the fix works correctly

## How the Fix Works

### Before (Problematic):
```
Speaker A starts: "Hello there, how are you..."
[ElevenLabs API call - 2 seconds]
Conversation system triggers new response: "Actually, let me say..."
❌ INTERRUPTION: Cancel current speech, start new one
[Loop continues - conversation never completes]
```

### After (Fixed):
```
Speaker A starts: "Hello there, how are you..."
[ElevenLabs API call - 2 seconds]
Conversation system triggers new response: "Actually, let me say..."
✅ ANALYSIS: 
   - Same speaker? Yes
   - Significantly different content? Yes  
   - Enough time passed? No (only 0.5s < 2s threshold)
   - DECISION: Block interruption, let original speech complete
[Original speech completes normally]
```

## Testing

### Manual Testing:
1. Start a conversation between two personalities with ElevenLabs TTS enabled
2. Observe that conversations complete without restarting
3. Check browser console for `[TTS DEBUG]` logs showing interruption decisions

### Automated Testing:
Run the test script in browser console:
```javascript
// Load the test functions
testTTSFix.testInterruption(); // Test rapid requests
testTTSFix.testTiming();       // Test timing logic
testTTSFix.checkState();       // Check current state
```

## Configuration

The fix includes configurable thresholds:

- **ElevenLabs Grace Period**: 2000ms (2 seconds)
- **Other Providers Grace Period**: 1000ms (1 second)  
- **Minimum Text Length**: 10 characters for interruption consideration
- **Text Comparison Length**: 20 characters for similarity analysis

These can be adjusted in the `speak()` function if needed.

## Expected Behavior

After this fix:

1. ✅ Conversations should complete without unexpected restarts
2. ✅ Legitimate interruptions (significantly different content after grace period) still work
3. ✅ Duplicate or similar TTS requests are properly filtered out
4. ✅ ElevenLabs API calls have sufficient time to complete
5. ✅ Debug logging helps track any remaining issues

## Monitoring

Watch for these console logs to verify the fix is working:

- `[TTS DEBUG] New speak request from...` - Shows all TTS requests
- `[TTS] Speaker X interruption approved...` - Shows allowed interruptions  
- `[TTS] Speaker X interruption blocked - preventing conversation restart` - Shows blocked interruptions

If you still see conversation restarts, check the console logs to see if the interruption logic needs further tuning.
