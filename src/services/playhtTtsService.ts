import { apiKeyService } from './apiKeyService';
import type { TtsEmotion } from '../types';

// PlayHT API v2 - Ultra-realistic TTS with emotion support
// Documentation: https://docs.play.ht/reference/api-getting-started
const PLAYHT_API_URL = 'https://api.play.ht/api/v2/tts/stream';

export interface PlayHtOptions {
  voice?: string; // Voice ID or manifest URL (s3://... format or simple name)
  emotion?: TtsEmotion;
  emotionIntensity?: number; // 0.0 to 1.0
  speed?: number; // 0.5 to 2.0
  temperature?: number; // 0.0 to 2.0 (controls randomness/expressiveness)
  voiceEngine?: 'PlayDialog' | 'PlayHT2.0-turbo' | 'Play3.0-mini' | 'PlayHT2.0'; // Engine selection
}

const EMOTION_TO_PLAYHT_STYLE: Record<TtsEmotion, { temperature: number; speedMod: number }> = {
  neutral: { temperature: 0.5, speedMod: 1.0 },
  happy: { temperature: 0.8, speedMod: 1.1 },
  sad: { temperature: 0.4, speedMod: 0.9 },
  angry: { temperature: 1.0, speedMod: 1.2 },
  excited: { temperature: 1.2, speedMod: 1.3 },
  fearful: { temperature: 0.9, speedMod: 1.15 },
  surprised: { temperature: 1.0, speedMod: 1.2 },
  disgusted: { temperature: 0.7, speedMod: 0.95 },
};

export const generateSpeech = async (
  apiKey: string | null,
  userId: string | null,
  text: string,
  options?: PlayHtOptions
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[PLAYHT TTS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  let finalApiKey = apiKey;
  if (!finalApiKey) {
    try {
      finalApiKey = await apiKeyService.getApiKey('playhtApiKey');
    } catch (error) {
      console.warn('Failed to fetch PlayHT API key from server:', error);
      finalApiKey = null;
    }
  }

  let finalUserId = userId;
  if (!finalUserId) {
    try {
      finalUserId = await apiKeyService.getApiKey('playhtUserId');
    } catch (error) {
      console.warn('Failed to fetch PlayHT User ID from server:', error);
      finalUserId = null;
    }
  }

  if (!finalApiKey || !finalUserId) {
    throw new Error("PlayHT API key and User ID are required. Please configure in Settings → Text to Speech → PlayHT fields.");
  }

  const emotion = options?.emotion || 'neutral';
  const emotionConfig = EMOTION_TO_PLAYHT_STYLE[emotion];
  const intensity = options?.emotionIntensity ?? 1.0;

  // Apply emotion through temperature and speed modulation
  const temperature = (options?.temperature ?? emotionConfig.temperature) * intensity;
  const speed = (options?.speed ?? 1.0) * emotionConfig.speedMod;

  // Default voice from PlayHT documentation
  const voice = options?.voice || 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';
  
  // Use PlayDialog for fastest, most realistic speech (from docs)
  const voiceEngine = options?.voiceEngine || 'PlayDialog';

  const response = await fetch(PLAYHT_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'audio/mpeg',
      'content-type': 'application/json',
      'AUTHORIZATION': finalApiKey,
      'X-USER-ID': finalUserId,
    },
    body: JSON.stringify({
      text: text,
      voice: voice,
      output_format: 'mp3',
      voice_engine: voiceEngine,
      emotion: emotion, // Pass emotion directly (PlayHT may support this natively)
      temperature: Math.max(0, Math.min(2, temperature)),
      speed: Math.max(0.5, Math.min(2, speed)),
      sample_rate: 24000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PlayHT TTS Error ${response.status}: ${errorText}`);
  }

  return response.blob();
};

// Popular PlayHT voices (from documentation)
export const PLAYHT_VOICES = [
  { id: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json', name: 'Female - Conversational', gender: 'female', engine: 'PlayDialog' },
  { id: 's3://voice-cloning-zero-shot/b7d50908-b17c-442d-ad8d-810c63997ed9/male-cs/manifest.json', name: 'Male - Conversational', gender: 'male', engine: 'PlayDialog' },
  { id: 's3://voice-cloning-zero-shot/775ae416-49bb-4fb6-bd45-740f205d20a1/female-cs/manifest.json', name: 'Female - Narrative', gender: 'female', engine: 'PlayHT2.0-turbo' },
  { id: 's3://voice-cloning-zero-shot/829fb2ab-17f9-4f42-88bc-7ecfbb5d06a0/male-cs/manifest.json', name: 'Male - Narrative', gender: 'male', engine: 'PlayHT2.0-turbo' },
];

// Voice Engines available:
// - PlayDialog: Fastest, most realistic (recommended)
// - PlayHT2.0-turbo: High quality, fast
// - Play3.0-mini: Compact, efficient
// - PlayHT2.0: Original v2 engine

