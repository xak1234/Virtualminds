import { apiKeyService } from './apiKeyService';

const API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Professional Google Cloud TTS voice names - Neural2 prioritized as highest quality
export const GEMINI_VOICES = {
  // Neural2 voices - Highest Quality (Premium natural prosody and expressiveness)
  'en-US-Neural2-A': 'en-US-Neural2-A (Female, Highest Quality)',
  'en-US-Neural2-C': 'en-US-Neural2-C (Female, Highest Quality)',
  'en-US-Neural2-D': 'en-US-Neural2-D (Male, Highest Quality)',
  'en-US-Neural2-E': 'en-US-Neural2-E (Female, Highest Quality)',
  'en-US-Neural2-F': 'en-US-Neural2-F (Female, Highest Quality)',
  'en-US-Neural2-G': 'en-US-Neural2-G (Female, Highest Quality)',
  'en-US-Neural2-H': 'en-US-Neural2-H (Female, Highest Quality)',
  'en-US-Neural2-I': 'en-US-Neural2-I (Male, Highest Quality)',
  'en-US-Neural2-J': 'en-US-Neural2-J (Male, Highest Quality)',
  
  // British Neural2 voices - Highest Quality
  'en-GB-Neural2-A': 'en-GB-Neural2-A (Female, British Highest Quality)',
  'en-GB-Neural2-B': 'en-GB-Neural2-B (Male, British Highest Quality)',
  'en-GB-Neural2-C': 'en-GB-Neural2-C (Female, British Highest Quality)',
  'en-GB-Neural2-D': 'en-GB-Neural2-D (Male, British Highest Quality)',
  
  // Australian Neural2 voices - Highest Quality
  'en-AU-Neural2-A': 'en-AU-Neural2-A (Female, Australian Highest Quality)',
  'en-AU-Neural2-B': 'en-AU-Neural2-B (Male, Australian Highest Quality)',
  'en-AU-Neural2-C': 'en-AU-Neural2-C (Female, Australian Highest Quality)',
  'en-AU-Neural2-D': 'en-AU-Neural2-D (Male, Australian Highest Quality)',
  
  // Journey voices - Ultra-premium conversational AI voices (secondary priority)
  'en-US-Journey-D': 'en-US-Journey-D (Male, Ultra-Premium)',
  'en-US-Journey-F': 'en-US-Journey-F (Female, Ultra-Premium)',
  'en-US-Journey-O': 'en-US-Journey-O (Female, Ultra-Premium)',
  
  // Wavenet voices - High quality fallback
  'en-US-Wavenet-A': 'en-US-Wavenet-A (Female, High Quality)',
  'en-US-Wavenet-B': 'en-US-Wavenet-B (Male, High Quality)',
  'en-US-Wavenet-C': 'en-US-Wavenet-C (Female, High Quality)',
  'en-US-Wavenet-D': 'en-US-Wavenet-D (Male, High Quality)',
  'en-US-Wavenet-E': 'en-US-Wavenet-E (Female, High Quality)',
  'en-US-Wavenet-F': 'en-US-Wavenet-F (Female, High Quality)',
  'en-US-Wavenet-G': 'en-US-Wavenet-G (Female, High Quality)',
  'en-US-Wavenet-H': 'en-US-Wavenet-H (Female, High Quality)',
  'en-US-Wavenet-I': 'en-US-Wavenet-I (Male, High Quality)',
  'en-US-Wavenet-J': 'en-US-Wavenet-J (Male, High Quality)',
  
  // British Wavenet voices
  'en-GB-Wavenet-A': 'en-GB-Wavenet-A (Female, British High Quality)',
  'en-GB-Wavenet-B': 'en-GB-Wavenet-B (Male, British High Quality)',
  'en-GB-Wavenet-C': 'en-GB-Wavenet-C (Female, British High Quality)',
  'en-GB-Wavenet-D': 'en-GB-Wavenet-D (Male, British High Quality)',
  
  // Standard voices - Basic quality fallback (kept for compatibility)
  'en-US-Standard-A': 'en-US-Standard-A (Female, Standard)',
  'en-US-Standard-B': 'en-US-Standard-B (Male, Standard)',
  'en-US-Standard-C': 'en-US-Standard-C (Female, Standard)',
  'en-US-Standard-D': 'en-US-Standard-D (Male, Standard)',
};

export const findBestVoiceMatch = (personalityName: string): string => {
  const name = personalityName.toLowerCase();
  
  // Enhanced voice selection prioritizing Neural2 as highest quality
  const voiceKeys = Object.keys(GEMINI_VOICES);
  
  // Prioritize by quality: Neural2 > Journey > Wavenet > Standard
  const neural2Voices = voiceKeys.filter(v => v.includes('Neural2'));
  const journeyVoices = voiceKeys.filter(v => v.includes('Journey'));
  const wavenetVoices = voiceKeys.filter(v => v.includes('Wavenet'));
  const standardVoices = voiceKeys.filter(v => v.includes('Standard'));
  
  // Detect accent preference from personality
  let accentPref = 'US';
  if (/(\buk\b|british|england|london|oxford|manchester|yorkshire|birmingham|liverpool|glasgow|edinburgh|wales|scotland)/.test(name)) {
    accentPref = 'GB';
  } else if (/(australi|aussie|sydney|melbourne|brisbane|perth|adelaide|darwin|canberra)/.test(name)) {
    accentPref = 'AU';
  }
  
  // Enhanced gender detection with more indicators
  const femaleIndicators = ['female', 'woman', 'girl', 'jenny', 'aria', 'emma', 'samantha', 'victoria', 'lucy', 'karen', 'sarah', 'mary', 'lisa', 'anna', 'helen', 'rose', 'claire', 'jane', 'susan', 'margaret'];
  const maleIndicators = ['male', 'man', 'boy', 'alex', 'daniel', 'christopher', 'matthew', 'benjamin', 'john', 'jimmy', 'david', 'michael', 'robert', 'william', 'james', 'thomas', 'charles', 'joseph', 'andrew', 'tony', 'keir'];
  
  const isFemale = femaleIndicators.some(indicator => name.includes(indicator));
  const isMale = maleIndicators.some(indicator => name.includes(indicator));
  
  // Build preference list in quality order, filtered by accent and gender
  const buildPreferenceList = (voices: string[]) => {
    let filtered = voices.filter(v => v.includes(`en-${accentPref}`));
    if (filtered.length === 0) filtered = voices.filter(v => v.includes('en-US')); // Fallback to US
    
    if (isFemale) {
      filtered = filtered.filter(v => GEMINI_VOICES[v as keyof typeof GEMINI_VOICES].includes('Female'));
    } else if (isMale) {
      filtered = filtered.filter(v => GEMINI_VOICES[v as keyof typeof GEMINI_VOICES].includes('Male'));
    }
    
    return filtered;
  };
  
  // Try each quality tier in order - Neural2 first as highest quality
  let preferredVoices = buildPreferenceList(neural2Voices);
  if (preferredVoices.length === 0) preferredVoices = buildPreferenceList(journeyVoices);
  if (preferredVoices.length === 0) preferredVoices = buildPreferenceList(wavenetVoices);
  if (preferredVoices.length === 0) preferredVoices = buildPreferenceList(standardVoices);
  
  // Return the best match or Neural2 default (highest quality)
  return preferredVoices[0] || 'en-US-Neural2-A';
};

export type GoogleTtsAudioOptions = {
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  effectsProfileId?: string[];
  audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
  // Professional enhancement options
  enableTimePointing?: boolean;
  enableSsmlVoiceGender?: 'NEUTRAL' | 'MALE' | 'FEMALE';
};

export const generateSpeech = async (
  apiKey: string | null,
  voiceName: string,
  text: string,
  options?: GoogleTtsAudioOptions,
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[GEMINI TTS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  // Try to get API key from server if not provided
  let finalApiKey = apiKey;
  if (!finalApiKey) {
    // Prefer dedicated TTS key if provided
    finalApiKey = await apiKeyService.getApiKey('geminiTtsApiKey');
  }
  if (!finalApiKey) {
    // Fallback to general Gemini key if TTS-specific key is not configured
    finalApiKey = await apiKeyService.getApiKey('geminiApiKey');
  }

  if (!finalApiKey) {
    throw new Error("Google Cloud TTS API key is not set. Please configure it in settings or ensure it's available on the server.");
  }
  if (!voiceName) {
    throw new Error("Google Cloud TTS Voice Name is not set for this personality.");
  }

  const requestBody = {
    input: {
      text: text
    },
    voice: {
      languageCode: voiceName.substring(0, 5), // e.g., 'en-US' from 'en-US-Neural2-A'
      name: voiceName,
      ...(options?.enableSsmlVoiceGender ? { ssmlGender: options.enableSsmlVoiceGender } : {})
    },
    audioConfig: {
      audioEncoding: options?.audioEncoding || 'MP3',
      speakingRate: options?.speakingRate ?? 1.0,
      pitch: options?.pitch ?? 0.0,
      volumeGainDb: options?.volumeGainDb ?? 0.0,
      ...(options?.effectsProfileId ? { effectsProfileId: options.effectsProfileId } : {}),
      ...(options?.enableTimePointing ? { enableTimePointing: options.enableTimePointing } : {}),
      // Professional quality settings
      sampleRateHertz: 24000, // Higher sample rate for better quality
    }
  };

  const response = await fetch(`${API_URL}?key=${finalApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Google Cloud TTS API Error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // The response contains base64-encoded audio data
  if (!data.audioContent) {
    throw new Error('No audio content received from Google Cloud TTS API');
  }

  // Convert base64 to blob
  const binaryString = atob(data.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: 'audio/mpeg' });
};