/**
 * Gang Sound Effects Service
 * Plays audio cues for gang events (bribe, recruitment, violence, death)
 */

import bribeSoundUrl from '../components/sounds/bribe.mp3';
import recruitSoundUrl from '../components/sounds/recruit.mp3';
import deathSoundUrl from '../components/sounds/death.mp3';
import violenceSoundUrl from '../components/sounds/violence.mp3';

export type GangSoundType = 'bribe' | 'recruit' | 'death' | 'violence';

class GangSoundService {
  private sounds: Map<GangSoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5; // Default 50% volume

  constructor() {
    this.initializeSounds();
  }

  /**
   * Pre-load all sound files
   */
  private initializeSounds(): void {
    const soundMap: Record<GangSoundType, string> = {
      bribe: bribeSoundUrl,
      recruit: recruitSoundUrl,
      death: deathSoundUrl,
      violence: violenceSoundUrl,
    };

    Object.entries(soundMap).forEach(([type, url]) => {
      try {
        const audio = new Audio(url);
        audio.volume = this.volume;
        audio.preload = 'auto';
        this.sounds.set(type as GangSoundType, audio);
        console.log(`[GANG SOUNDS] Loaded: ${type}.mp3`);
      } catch (error) {
        console.error(`[GANG SOUNDS] Failed to load ${type}.mp3:`, error);
      }
    });
  }

  /**
   * Play a gang sound effect
   */
  public play(soundType: GangSoundType): void {
    if (!this.enabled) {
      return;
    }

    const audio = this.sounds.get(soundType);
    if (!audio) {
      console.warn(`[GANG SOUNDS] Sound not found: ${soundType}`);
      return;
    }

    try {
      // Reset to beginning if already playing
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.warn(`[GANG SOUNDS] Playback failed for ${soundType}:`, error);
      });
      console.log(`[GANG SOUNDS] Playing: ${soundType}.mp3`);
    } catch (error) {
      console.error(`[GANG SOUNDS] Error playing ${soundType}:`, error);
    }
  }

  /**
   * Set volume for all sounds (0.0 to 1.0)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  /**
   * Enable or disable sound effects
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current enabled state
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const gangSoundService = new GangSoundService();

