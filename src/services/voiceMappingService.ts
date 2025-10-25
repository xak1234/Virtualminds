import type { Personality } from '../types';
import { voiceIdRegistry } from './voiceIdRegistryService';

export interface VoiceMapping {
  voice_id: string;
  keywords: string[];
  description: string;
}

export interface VoiceMappings {
  voice_mappings: {
    [key: string]: VoiceMapping;
  };
  assignment_log: {
    created: string;
    last_updated: string;
    assignments_made: any[];
  };
}

/**
 * Loads voice mappings from the voice-id-mappings.json file
 */
export const loadVoiceMappings = async (): Promise<VoiceMappings | null> => {
  try {
    const response = await fetch('/voice-id-mappings.json');
    if (!response.ok) {
      console.error('Failed to load voice mappings:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data as VoiceMappings;
  } catch (error) {
    console.error('Error loading voice mappings:', error);
    return null;
  }
};

/**
 * Finds the best voice mapping for a personality based on name matching
 * Uses fuzzy matching with keywords and partial name matching
 */
export const findBestVoiceMapping = (personality: Personality, voiceMappings: VoiceMappings): VoiceMapping | null => {
  if (!voiceMappings?.voice_mappings) {
    return null;
  }

  const name = personality.name.toLowerCase().trim();
  const nameWords = name.split(/\s+/);
  
  // Score each voice mapping based on how well it matches
  const scoredMappings: Array<{ mapping: VoiceMapping; score: number; key: string }> = [];
  
  for (const [key, mapping] of Object.entries(voiceMappings.voice_mappings)) {
    let score = 0;
    
    // Check for exact key match (highest priority)
    if (key.toLowerCase() === name.replace(/\s+/g, '_')) {
      score += 100;
    }
    
    // Check for partial key match
    const keyWords = key.toLowerCase().split('_');
    const keyMatchCount = keyWords.filter(keyWord => 
      nameWords.some(nameWord => 
        nameWord.includes(keyWord) || keyWord.includes(nameWord)
      )
    ).length;
    score += keyMatchCount * 20;
    
    // Check keyword matches
    const keywordMatches = mapping.keywords.filter(keyword => 
      nameWords.some(nameWord => 
        nameWord.includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(nameWord)
      )
    ).length;
    score += keywordMatches * 15;
    
    // Check for partial name matches in keywords
    const partialMatches = mapping.keywords.filter(keyword => 
      name.includes(keyword.toLowerCase()) || 
      keyword.toLowerCase().includes(name)
    ).length;
    score += partialMatches * 10;
    
    // Special case matches for known personalities
    if (name.includes('tony') && name.includes('blair') && key.includes('tony_blair')) {
      score += 50;
    }
    if (name.includes('donald') && name.includes('trump') && key.includes('donald_trump')) {
      score += 50;
    }
    if (name.includes('lucy') && name.includes('letby') && key.includes('lucy_letby')) {
      score += 50;
    }
    if (name.includes('jill') && name.includes('dando') && key.includes('jill_dando')) {
      score += 50;
    }
    if (name.includes('myra') && name.includes('hindley') && key.includes('myra_hindley')) {
      score += 50;
    }
    if (name.includes('maxine') && name.includes('carr') && key.includes('maxine_carr')) {
      score += 50;
    }
    if (name.includes('reggie') && name.includes('cray') && key.includes('reggie_cray')) {
      score += 50;
    }
    if (name.includes('idi') && name.includes('amin') && key.includes('idi_amin')) {
      score += 50;
    }
    if (name.includes('adolf') && name.includes('hitler') && key.includes('adolf_hitler')) {
      score += 50;
    }
    if (name.includes('gypsy') && key.includes('gypsy')) {
      score += 50;
    }
    if (name.includes('jimmy') && key.includes('jimmy')) {
      score += 50;
    }
    if (name.includes('huntley') && key.includes('huntley')) {
      score += 50;
    }
    if (name.includes('karen') && key.includes('karen')) {
      score += 50;
    }
    if (name.includes('yorkshire') && key.includes('yorkshire')) {
      score += 50;
    }
    
    if (score > 0) {
      scoredMappings.push({ mapping, score, key });
    }
  }
  
  // Return the mapping with the highest score
  if (scoredMappings.length > 0) {
    scoredMappings.sort((a, b) => b.score - a.score);
    return scoredMappings[0].mapping;
  }
  
  return null;
};

/**
 * Assigns voice ID to personality using voice mappings
 */
export const assignVoiceIdToPersonality = async (personality: Personality): Promise<Personality> => {
  const voiceMappings = await loadVoiceMappings();
  if (!voiceMappings) {
    console.warn('Could not load voice mappings, returning personality unchanged');
    return personality;
  }
  
  const bestMapping = findBestVoiceMapping(personality, voiceMappings);
  if (bestMapping && bestMapping.voice_id && bestMapping.voice_id !== 'replace_any_other_replicas') {
    try { voiceIdRegistry.setVoiceId(personality.id, bestMapping.voice_id); } catch (err) {
      console.warn('Failed to store mapped voice ID in registry', personality?.name || personality.id, err);
    }
    return {
      ...personality,
      config: {
        ...personality.config,
        voiceId: bestMapping.voice_id
      }
    };
  }
  
  return personality;
};

/**
 * Gets all available voice mappings for display purposes
 */
export const getAllVoiceMappings = async (): Promise<Array<{ key: string; mapping: VoiceMapping }>> => {
  const voiceMappings = await loadVoiceMappings();
  if (!voiceMappings?.voice_mappings) {
    return [];
  }
  
  return Object.entries(voiceMappings.voice_mappings).map(([key, mapping]) => ({
    key,
    mapping
  }));
};
