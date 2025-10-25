# Gang Sound Effects System

## 🔊 Overview

The gang sound system automatically plays audio cues when specific gang events occur in the Prison Gangs simulation.

## 📍 Sound Files Location

All sound files are located in: `components/sounds/`

Current sound files:
- **bribe.mp3** - Plays when a successful bribe occurs
- **recruit.mp3** - Plays when a gang recruits a member
- **death.mp3** - Plays when someone is killed
- **violence.mp3** - Plays when violence occurs

## 🎵 Event-to-Sound Mapping

| Gang Event | Sound File | Trigger Condition |
|------------|-----------|-------------------|
| **Successful Bribe** | `bribe.mp3` | When a guard accepts a bribe for a weapon |
| **Recruitment** | `recruit.mp3` | When a gang successfully recruits a new member |
| **Death** | `death.mp3` | When a personality is killed in gang violence |
| **Violence** | `violence.mp3` | When violence occurs (successful hit) |

## 🏗️ Architecture

### Service: `gangSoundService.ts`

The gang sound service provides:

```typescript
gangSoundService.play(soundType: 'bribe' | 'recruit' | 'death' | 'violence')
gangSoundService.setVolume(volume: number) // 0.0 to 1.0
gangSoundService.setEnabled(enabled: boolean)
```

**Features:**
- ✅ Pre-loads all sounds on initialization for instant playback
- ✅ Singleton pattern - one instance across the app
- ✅ Automatic reset if sound is already playing
- ✅ Default volume: 50% (0.5)
- ✅ Graceful error handling if sound files are missing

### Integration: `App.tsx`

Sounds are triggered in the `addGangEvent()` callback:

```typescript
// Play sound effect based on event type
if (experimentalSettingsRef.current.gangsEnabled) {
  switch (type) {
    case 'bribe_success':
      gangSoundService.play('bribe');
      break;
    case 'recruitment':
      gangSoundService.play('recruit');
      break;
    case 'death':
    case 'killed':
      gangSoundService.play('death');
      break;
    case 'violence':
    case 'hit':
      gangSoundService.play('violence');
      break;
  }
}
```

**Conditions:**
- ✅ Only plays when gang mode is enabled
- ✅ Automatically plays when gang events are added
- ✅ Works with both conversation-triggered and random gang events
- ✅ Independent of TTS system (can play simultaneously)

## 🎮 Testing

To test gang sounds:

1. **Enable Gang Mode:**
   - Settings → Experimental → Gangs → Enable

2. **Load Personalities:**
   - Load 2+ personalities

3. **Trigger Events:**
   - **Bribe:** Use CLI command: `bribe [personality] [gun|shank|chain]`
   - **Recruitment:** Enable autonomous communication and wait for positive interactions
   - **Violence:** Enable autonomous communication and wait for hostile interactions between rival gangs
   - **Death:** Multiple violence events can lead to death

4. **Watch Gang Debug Window:**
   - Events are logged in the Gang Debug window
   - Sounds play automatically when events occur

## 🔧 Customization

### Change Volume

```typescript
// In browser console or modify gangSoundService.ts
gangSoundService.setVolume(0.8); // 80% volume
```

### Disable Sounds

```typescript
gangSoundService.setEnabled(false);
```

### Replace Sound Files

1. Replace MP3 files in `components/sounds/`
2. Keep the same filenames: `bribe.mp3`, `recruit.mp3`, `death.mp3`, `violence.mp3`
3. Recommended specs:
   - Format: MP3
   - Length: 1-3 seconds
   - Sample rate: 44.1kHz or 48kHz
   - Bitrate: 128kbps or higher

## 🐛 Troubleshooting

### Sounds Not Playing

**Check:**
1. Gang mode is enabled (Settings → Experimental → Gangs)
2. Sound files exist in `components/sounds/`
3. Browser allows audio playback (check console for errors)
4. Volume is not muted/zero

**Common Issues:**
- Browser autoplay policy may block sounds on first load - click anywhere in the app
- Check browser console for `[GANG SOUNDS]` log messages
- Verify sound files are valid MP3 format

### Sounds Playing at Wrong Time

**Verify:**
- Event type matches in `addGangEvent()` switch statement
- Gang events are being logged correctly in Gang Debug Window

## 📝 Adding New Sounds

To add new sound effects:

1. **Add MP3 file** to `components/sounds/`
2. **Import in service:**
   ```typescript
   import newSoundUrl from '../components/sounds/newsound.mp3';
   ```
3. **Add to sound map:**
   ```typescript
   const soundMap: Record<GangSoundType, string> = {
     // ... existing sounds
     newsound: newSoundUrl,
   };
   ```
4. **Update type:**
   ```typescript
   export type GangSoundType = 'bribe' | 'recruit' | 'death' | 'violence' | 'newsound';
   ```
5. **Add to App.tsx switch:**
   ```typescript
   case 'new_event_type':
     gangSoundService.play('newsound');
     break;
   ```

## 🎯 Performance Notes

- Sounds are pre-loaded on app initialization
- No network delay during playback
- Minimal memory footprint (~500KB total)
- Non-blocking - doesn't affect app performance
- Can play simultaneously with TTS audio

## 📚 Related Files

- `services/gangSoundService.ts` - Core sound service
- `App.tsx` - Event integration and sound triggering
- `components/sounds/` - Sound file directory
- `services/gangService.ts` - Gang event generation
- `components/GangDebugWindow.tsx` - Event type definitions

