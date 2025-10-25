

import { apiKeyService } from './apiKeyService';
import { logApiUsage } from './costTrackingService';

const TTS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';
const VOICES_API_URL = 'https://api.elevenlabs.io/v1/voices';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

export const listVoices = async (apiKey?: string): Promise<ElevenLabsVoice[]> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[ELEVENLABS] Aborting listVoices - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  let finalApiKey = apiKey || await apiKeyService.getApiKey('elevenlabsApiKey');
  if (!finalApiKey) {
    throw new Error('ElevenLabs API key is not set.');
  }
  const res = await fetch(VOICES_API_URL, {
    headers: {
      'xi-api-key': finalApiKey,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch ElevenLabs voices: ${res.status} ${text}`);
  }
  const data = await res.json();
  // API returns { voices: [...] }
  return (data.voices || []) as ElevenLabsVoice[];
};

export const findBestVoiceMatch = (voices: ElevenLabsVoice[], personalityName: string): ElevenLabsVoice | null => {
  if (!voices || voices.length === 0) return null;
  const name = personalityName.toLowerCase();
  // Simple heuristics: exact match, starts with, includes, then fallback random voice
  let match = voices.find(v => v.name.toLowerCase() === name);
  if (match) return match;
  match = voices.find(v => v.name.toLowerCase().startsWith(name));
  if (match) return match;
  match = voices.find(v => name.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(name));
  if (match) return match;
  
  // If no match found, return a random voice instead of the first one
  return getRandomVoice(voices);
};

export const getRandomVoice = (voices: ElevenLabsVoice[]): ElevenLabsVoice | null => {
  if (!voices || voices.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * voices.length);
  return voices[randomIndex];
};

export const assignRandomVoiceIds = async (personalitiesWithoutVoices: Array<{id: string, name: string}>, apiKey?: string): Promise<Array<{personalityId: string, voiceId: string, voiceName: string}>> => {
  try {
    // Note: listVoices already checks global TTS enabled, so we don't need to check again here
    const voices = await listVoices(apiKey);
    if (!voices || voices.length === 0) {
      throw new Error('No ElevenLabs voices available');
    }
    
    const assignments: Array<{personalityId: string, voiceId: string, voiceName: string}> = [];
    
    personalitiesWithoutVoices.forEach(personality => {
      const randomVoice = getRandomVoice(voices);
      if (randomVoice) {
        assignments.push({
          personalityId: personality.id,
          voiceId: randomVoice.voice_id,
          voiceName: randomVoice.name
        });
      }
    });
    
    return assignments;
  } catch (error) {
    console.error('Failed to assign random voice IDs:', error);
    return [];
  }
};

export interface ElevenLabsOptions {
  stability?: number; // 0.0 to 1.0
  similarityBoost?: number; // 0.0 to 1.0
  style?: number; // 0.0 to 1.0 (v2 models only)
  useSpeakerBoost?: boolean;
  model?: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_turbo_v2' | 'eleven_monolingual_v1';
}

export const generateSpeech = async (
  apiKey: string | null,
  voiceId: string,
  text: string,
  options?: ElevenLabsOptions
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[ELEVENLABS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  // Try to get API key from server if not provided
  let finalApiKey = apiKey;
  if (!finalApiKey) {
    finalApiKey = await apiKeyService.getApiKey('elevenlabsApiKey');
  }

  if (!finalApiKey) {
    throw new Error("ElevenLabs API key is not set. Please configure it in settings or ensure it's available on the server.");
  }
  if (!voiceId) {
      throw new Error("ElevenLabs Voice ID is not set for this personality.");
  }

  // Sanitize the voice ID to handle cases where users might paste extra info (e.g., "voiceId - name")
  const cleanVoiceId = voiceId.trim().split(' ')[0];

  // Use the fastest, highest quality model by default
  const modelId = options?.model || 'eleven_turbo_v2_5';
  
  const voiceSettings: any = {
    stability: options?.stability ?? 0.5,
    similarity_boost: options?.similarityBoost ?? 0.75,
  };
  
  // Add style for v2 models (increases expressiveness and emotion)
  if (modelId.includes('v2') && options?.style !== undefined) {
    voiceSettings.style = options.style;
  }
  
  // Add speaker boost if requested
  if (options?.useSpeakerBoost) {
    voiceSettings.use_speaker_boost = true;
  }

  const response = await fetch(`${TTS_API_URL}${cleanVoiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': finalApiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: modelId,
      voice_settings: voiceSettings,
      // Be explicit about output encoding for consistent playback
      output_format: 'mp3_44100_128'
    }),
  });

  if (!response.ok) {
    // Read raw text to avoid JSON parse failures on HTML/text error bodies
    let bodyText = '';
    try { bodyText = await response.text(); } catch {}

    let message = `ElevenLabs API Error ${response.status}: ${response.statusText}`;
    
    // Common error codes
    if (response.status === 401) {
      message = 'ElevenLabs API key is invalid or expired';
    } else if (response.status === 403) {
      message = 'ElevenLabs API key lacks permission or quota exceeded';
    } else if (response.status === 404) {
      message = 'ElevenLabs voice ID not found - please check the voice ID';
    } else if (response.status === 429) {
      message = 'ElevenLabs rate limit exceeded - please wait and try again';
    }
    
    try {
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      const detail = parsed?.detail?.message || parsed?.message || parsed?.error || parsed?.errors?.[0]?.message;
      if (detail) {
        message += ` - ${detail}`;
      } else if (bodyText && !message.includes('ElevenLabs')) {
        message += ` - ${bodyText.slice(0, 300)}`;
      }
    } catch {
      if (bodyText && !message.includes('ElevenLabs')) {
        message += ` - ${bodyText.slice(0, 300)}`;
      }
    }
    
    // Log failed TTS request
    logApiUsage('elevenlabs', 'tts', 0, 0, 'error', modelId, message, text.length);
    
    throw new Error(message);
  }

  // Get the blob and ensure it has the correct MIME type
  const blob = await response.blob();
  
  // Log successful TTS request
  logApiUsage('elevenlabs', 'tts', 0, 0, 'success', modelId, undefined, text.length);
  
  // If the blob doesn't have a type or has wrong type, create a new one with correct type
  if (!blob.type || !blob.type.startsWith('audio/')) {
    console.warn('[ElevenLabs] Blob has incorrect type:', blob.type, '- creating new blob with audio/mpeg type');
    return new Blob([blob], { type: 'audio/mpeg' });
  }
  
  return blob;
};
