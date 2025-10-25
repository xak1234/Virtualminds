import type { Personality } from '../types';

export type VoiceIdMap = { [personalityId: string]: string };

const STORAGE_KEY = 'cmf_voice_id_map';

class VoiceIdRegistryService {
  private load(): VoiceIdMap {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as VoiceIdMap;
      return {};
    } catch {
      return {};
    }
  }

  private save(map: VoiceIdMap) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
  }

  public getAll(): VoiceIdMap {
    return this.load();
  }

  public getVoiceId(personalityId: string): string | null {
    const map = this.load();
    return map[personalityId] || null;
  }

  public setVoiceId(personalityId: string, voiceId: string) {
    const map = this.load();
    if (!voiceId || !voiceId.trim()) {
      delete map[personalityId];
      this.save(map);
      return;
    }
    map[personalityId] = voiceId.trim();
    this.save(map);
  }

  public removeVoiceId(personalityId: string) {
    const map = this.load();
    delete map[personalityId];
    this.save(map);
  }

  public clearAll() {
    this.save({});
  }

  public import(json: string): VoiceIdMap {
    try {
      const parsed = JSON.parse(json) as VoiceIdMap;
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid mapping JSON');
      this.save(parsed);
      return parsed;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Invalid mapping JSON');
    }
  }

  public export(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  public pruneUnknown(personalities: Personality[]) {
    const known = new Set(personalities.map(p => p.id));
    const map = this.load();
    let changed = false;
    for (const key of Object.keys(map)) {
      if (!known.has(key)) { delete map[key]; changed = true; }
    }
    if (changed) this.save(map);
  }
}

export const voiceIdRegistry = new VoiceIdRegistryService();